import { ObjectId } from "mongodb";
import { getMongoClient } from "../database/mongo.js";
import { getCollection } from "./index.js";
import { requireActiveBranch } from "./branchService.js";
import { COLLECTIONS } from "../../shared/schemas/index.js";
import { calculateUomSale } from "../../shared/uom.js";
import { ensureChartOfAccounts } from "./accountingCompletionService.js";
import { assertPersistedPeriodOpen } from "./accountingPeriodService.js";
import { postJournalInSession, toMinorUnits, fromMinorUnits } from "./ledgerService.js";

function fail(message, statusCode = 400) { const error = new Error(message); error.statusCode = statusCode; throw error; }
function id(value, label) { if (!ObjectId.isValid(value)) fail(`Invalid ${label}.`); return new ObjectId(value); }
function qty(value) { const n = Number(value); if (!Number.isFinite(n) || n <= 0) fail("Sale quantity must be greater than zero."); return n; }

const PAYMENT_ACCOUNTS = Object.freeze({ CASH: "1000", MPESA: "1020", "M-PESA": "1020", "MIXX BY YAS": "1020", MIXX: "1020", "MIX BY YAS": "1020", "AIRTEL MONEY": "1020", AIRTEL: "1020", HALOPESA: "1020", "HALO PESA": "1020", "T-PESA": "1020", TPESA: "1020", BANK: "1010", CARD: "1010", VISA: "1010", INSURANCE: "1100", RECEIVABLE: "1100" });
function paymentAccount(method) { return PAYMENT_ACCOUNTS[String(method || "").trim().toUpperCase()] || null; }

export async function createSale({ tenantId, branchId, items = [], payments = [], customerId = null, cashierId = null, discount = 0, idempotencyKey = null }) {
    if (!tenantId) fail("Tenant context is required.", 403);
    const branch = String(branchId || "").trim();
    await requireActiveBranch(tenantId, branch);
    if (!Array.isArray(items) || items.length === 0) fail("At least one sale item is required.");
    if (!Array.isArray(payments) || payments.length === 0) fail("At least one payment is required.");
    const discountValue = Number(discount) || 0;
    if (!Number.isFinite(discountValue) || discountValue < 0) fail("Discount must be zero or greater.");
    const journalKey = String(idempotencyKey || "").trim();
    if (!journalKey) fail("Sale idempotencyKey is required for accounting-safe completion.");
    await assertPersistedPeriodOpen({ tenantId, at: new Date() });
    await ensureChartOfAccounts(tenantId);

    const client = getMongoClient();
    const db = client.db();
    const sales = db.collection(COLLECTIONS.SALES);
    const existing = await sales.findOne({ tenantId, idempotencyKey: journalKey });
    if (existing) {
        const ledger = await db.collection(COLLECTIONS.LEDGER_JOURNALS).findOne({ tenantId, idempotencyKey: `SALE:${journalKey}` });
        return { ...existing, ledgerJournalId: ledger?._id || existing.ledgerJournalId || null, ledgerDuplicate: true };
    }

    const session = client.startSession();
    try {
        let sale;
        await session.withTransaction(async () => {
            const products = db.collection(COLLECTIONS.PRODUCTS);
            const batches = db.collection(COLLECTIONS.BATCHES);
            const saleItems = db.collection(COLLECTIONS.SALE_ITEMS);
            const movements = db.collection(COLLECTIONS.STOCK_MOVEMENTS);
            const normalizedItems = [];
            let subtotal = 0;
            let cogsMinor = 0n;

            for (const raw of items) {
                const productId = id(raw.productId, "product ID");
                const quantity = qty(raw.quantity);
                const product = await products.findOne({ _id: productId, tenantId }, { session });
                if (!product) fail("One or more products are not available in this tenant.", 404);
                const requestedUom = raw.uom || product.baseUnit || "UNIT";
                const saleCalc = calculateUomSale(product, quantity, requestedUom, raw.unitPrice);
                const lineTotal = saleCalc.lineTotal;
                subtotal += lineTotal;
                normalizedItems.push({ productId, productName: product.brandName || product.genericName, brandName: product.brandName || null, genericName: product.genericName || null, quantity: saleCalc.quantity, uom: saleCalc.unit, conversionToBase: saleCalc.conversionToBase, baseQuantity: saleCalc.baseQuantity, unitPrice: saleCalc.unitPrice, lineTotal, requestedBatchId: raw.batchId ? id(raw.batchId, "batch ID") : null });
            }

            const total = Math.max(subtotal - discountValue, 0);
            const paymentCurrencies = [...new Set(payments.map((payment) => String(payment.currency || "TZS").trim().toUpperCase()))];
            if (paymentCurrencies.length !== 1) fail("All payments in one sale must use the same currency.");
            const currency = paymentCurrencies[0];
            const paymentTotal = payments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
            if (!Number.isFinite(paymentTotal) || Math.abs(paymentTotal - total) > 0.0001) fail(`Payment total must equal sale total (${total}).`);
            for (const payment of payments) if (!paymentAccount(payment.method)) fail(`Unsupported payment method for accounting: ${payment.method || "empty"}.`);

            const now = new Date();
            const today = new Date(); today.setHours(0, 0, 0, 0);
            const saleDoc = { tenantId, branchId: branch, customerId: customerId ? String(customerId).trim() : null, cashierId: cashierId ? String(cashierId).trim() : null, subtotal, discount: discountValue, total, idempotencyKey: journalKey, payments: payments.map(payment => ({ method: String(payment.method || "").trim().toUpperCase(), provider: payment.provider ? String(payment.provider).trim().toUpperCase() : null, amount: Number(payment.amount), currency: String(payment.currency || "TZS").trim().toUpperCase() })), status: "COMPLETED", createdAt: now };
            const saleResult = await sales.insertOne(saleDoc, { session });
            const paymentLines = payments.map((payment) => ({ account: paymentAccount(payment.method), side: "DEBIT", amount: Number(payment.amount).toFixed(2), memo: `${String(payment.method).trim().toUpperCase()} settlement` }));

            for (const item of normalizedItems) {
                let remaining = item.baseQuantity;
                const batchFilter = item.requestedBatchId ? { _id: item.requestedBatchId, tenantId, productId: item.productId, branchId: branch, quantity: { $gt: 0 }, expiryDate: { $gte: today } } : { tenantId, productId: item.productId, branchId: branch, quantity: { $gt: 0 }, expiryDate: { $gte: today } };
                const availableBatches = await batches.find(batchFilter, { session }).sort({ expiryDate: 1, createdAt: 1 }).toArray();
                for (const batch of availableBatches) {
                    if (remaining <= 0) break;
                    const take = Math.min(remaining, Number(batch.quantity));
                    if (take <= 0) continue;
                    if (batch.costPrice == null || !Number.isFinite(Number(batch.costPrice)) || Number(batch.costPrice) < 0) fail(`Cost price is required for accounting-safe sale of ${item.productName}.`, 409);
                    const result = await batches.updateOne({ _id: batch._id, tenantId, productId: item.productId, branchId: branch, quantity: { $gte: take } }, { $inc: { quantity: -take }, $set: { updatedAt: new Date() } }, { session });
                    if (!result.modifiedCount) continue;
                    cogsMinor += toMinorUnits((take * Number(batch.costPrice)).toFixed(2));
                    await movements.insertOne({ tenantId, branchId: branch, productId: item.productId, batchId: batch._id, type: "SALE", quantity: take, direction: "OUT", reference: `SALE:${saleResult.insertedId}`, unitCost: batch.costPrice, createdAt: new Date() }, { session });
                    remaining -= take;
                }
                if (remaining > 0) fail(`Insufficient unexpired stock for ${item.productName}.`, 409);
                const productUpdate = await products.updateOne({ _id: item.productId, tenantId, stockQuantity: { $gte: item.baseQuantity } }, { $inc: { stockQuantity: -item.baseQuantity }, $set: { updatedAt: new Date() } }, { session });
                if (!productUpdate.modifiedCount) fail(`Product stock is inconsistent for ${item.productName}.`, 409);
                await saleItems.insertOne({ tenantId, saleId: saleResult.insertedId, productId: item.productId, productName: item.productName, brandName: item.brandName, genericName: item.genericName, quantity: item.quantity, unitPrice: item.unitPrice, lineTotal: item.lineTotal, uom: item.uom, conversionToBase: item.conversionToBase, baseQuantity: item.baseQuantity, createdAt: new Date() }, { session });
            }

            const revenueMinor = toMinorUnits(total.toFixed(2));
            const lines = [...paymentLines, { account: "4000", side: "CREDIT", amount: fromMinorUnits(revenueMinor), memo: "Sale revenue" }];
            if (cogsMinor > 0n) {
                lines.push({ account: "5000", side: "DEBIT", amount: fromMinorUnits(cogsMinor), memo: "Cost of goods sold" });
                lines.push({ account: "1200", side: "CREDIT", amount: fromMinorUnits(cogsMinor), memo: "Inventory relief" });
            }
            const journal = await postJournalInSession({ session, tenantId, branchId: branch, currency, referenceType: "SALE", referenceId: saleResult.insertedId.toString(), idempotencyKey: `SALE:${journalKey}`, description: `Sale ${saleResult.insertedId}`, lines });
            sale = { ...saleDoc, _id: saleResult.insertedId, ledgerJournalId: journal.journal._id, ledgerDuplicate: journal.duplicate };
        });
        return sale;
    } finally { await session.endSession(); }
}

export async function listSales({ tenantId, branchId, limit = 100, skip = 0 } = {}) {
    const filter = { tenantId };
    if (branchId) filter.branchId = String(branchId).trim();
    const safeLimit = Math.min(Math.max(Number(limit) || 100, 1), 200);
    const safeSkip = Math.max(Number(skip) || 0, 0);
    return getCollection(COLLECTIONS.SALES).find(filter).sort({ createdAt: -1 }).skip(safeSkip).limit(safeLimit).toArray();
}
