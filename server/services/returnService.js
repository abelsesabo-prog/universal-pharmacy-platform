import { ObjectId } from "mongodb";
import { getMongoClient } from "../database/mongo.js";
import { getCollection } from "./index.js";
import { requireActiveBranch } from "./branchService.js";
import { COLLECTIONS } from "../../shared/schemas/index.js";
import { ensureChartOfAccounts } from "./accountingCompletionService.js";
import { postJournalInSession, toMinorUnits, fromMinorUnits } from "./ledgerService.js";
import { assertPersistedPeriodOpen } from "./accountingPeriodService.js";

function fail(message, statusCode = 400) { const error = new Error(message); error.statusCode = statusCode; throw error; }
function text(value) { return String(value ?? "").trim(); }
function objectId(value, label) { if (!ObjectId.isValid(value)) fail(`Invalid ${label}.`); return new ObjectId(value); }
function positive(value, label) { const n = Number(value); if (!Number.isFinite(n) || n <= 0) fail(`${label} must be greater than zero.`); return n; }

const REFUND_ACCOUNTS = Object.freeze({ CASH: "1000", BANK: "1010", MPESA: "1020", MIXX: "1020", AIRTEL: "1020", HALOPESA: "1020", TPESA: "1020", INSURANCE: "1100", RECEIVABLE: "1100" });
function refundAccount(method) {
    const normalized = text(method).toUpperCase().replace(/[\s-]+/g, "_");
    const aliases = { "M_PESA": "MPESA", "MIX_BY_YAS": "MIXX", "MIX_X": "MIXX", "AIRTEL_MONEY": "AIRTEL", "HALO_PESA": "HALOPESA", "T_PESA": "TPESA" };
    const key = aliases[normalized] || normalized;
    const account = REFUND_ACCOUNTS[key];
    if (!account) fail("Unsupported refund payment method.");
    return account;
}

async function refundedBaseQuantities(db, tenantId, saleId, productId, session) {
    const returns = await db.collection(COLLECTIONS.RETURN_ITEMS).aggregate([
        { $match: { tenantId, saleId, productId } },
        { $group: { _id: null, quantity: { $sum: "$baseQuantity" } } }
    ], { session }).toArray();
    return Number(returns[0]?.quantity || 0);
}

export async function createSaleReturn({ tenantId, branchId, saleId, items = [], refundPaymentMethod, idempotencyKey, reason = "CUSTOMER_RETURN", createdBy = null } = {}) {
    const tenant = text(tenantId);
    if (!tenant) fail("Tenant context is required.", 403);
    const key = text(idempotencyKey);
    if (!key) fail("Return idempotency key is required.");
    const saleObjectId = objectId(saleId, "sale ID");
    if (!Array.isArray(items) || !items.length) fail("At least one return item is required.");
    const refundAccountCode = refundAccount(refundPaymentMethod);
    await requireActiveBranch(tenant, text(branchId));
    await assertPersistedPeriodOpen({ tenantId: tenant, at: new Date() });
    await ensureChartOfAccounts(tenant);

    const client = getMongoClient();
    const db = client.db();
    const returns = db.collection(COLLECTIONS.RETURNS);
    await returns.createIndex({ tenantId: 1, idempotencyKey: 1 }, { unique: true, name: "return_tenant_idempotency_unique" });
    const existing = await returns.findOne({ tenantId: tenant, idempotencyKey: key });
    if (existing) return { return: existing, duplicate: true };

    const session = client.startSession();
    try {
        let result;
        await session.withTransaction(async () => {
            const sales = db.collection(COLLECTIONS.SALES);
            const saleItems = db.collection(COLLECTIONS.SALE_ITEMS);
            const movements = db.collection(COLLECTIONS.STOCK_MOVEMENTS);
            const batches = db.collection(COLLECTIONS.BATCHES);
            const products = db.collection(COLLECTIONS.PRODUCTS);
            const returnItems = db.collection(COLLECTIONS.RETURN_ITEMS);
            const sale = await sales.findOne({ _id: saleObjectId, tenantId: tenant, branchId: text(branchId) }, { session });
            if (!sale || sale.status !== "COMPLETED") fail("Completed sale not found in this tenant and branch.", 404);
            const concurrent = await returns.findOne({ tenantId: tenant, idempotencyKey: key }, { session });
            if (concurrent) { result = { return: concurrent, duplicate: true }; return; }

            const saleItemDocs = await saleItems.find({ tenantId: tenant, saleId: saleObjectId }, { session }).toArray();
            if (!saleItemDocs.length) fail("Sale has no line items.", 409);
            const saleMovements = await movements.find({ tenantId: tenant, reference: `SALE:${saleObjectId}` }, { session }).sort({ createdAt: 1 }).toArray();
            const movementByProduct = new Map();
            for (const movement of saleMovements) {
                const keyProduct = String(movement.productId);
                if (!movementByProduct.has(keyProduct)) movementByProduct.set(keyProduct, []);
                movementByProduct.get(keyProduct).push(movement);
            }

            let refundMinor = 0n;
            let cogsMinor = 0n;
            const createdItems = [];
            const now = new Date();
            for (const raw of items) {
                const productId = objectId(raw.productId, "product ID");
                const requestedBaseQuantity = positive(raw.baseQuantity ?? raw.quantity, "Return quantity");
                const original = saleItemDocs.find(item => String(item.productId) === String(productId));
                if (!original) fail("Return item is not part of the original sale.", 409);
                const alreadyReturned = await refundedBaseQuantities(db, tenant, saleObjectId, productId, session);
                if (alreadyReturned + requestedBaseQuantity > Number(original.baseQuantity)) fail(`Return quantity exceeds sold quantity for ${original.productName || productId}.`, 409);

                const soldMovements = movementByProduct.get(String(productId)) || [];
                let remaining = requestedBaseQuantity;
                let lineRefundMinor = 0n;
                for (const movement of soldMovements) {
                    if (remaining <= 0) break;
                    const previouslyReturned = await returnItems.aggregate([
                        { $match: { tenantId: tenant, saleId: saleObjectId, productId, batchId: movement.batchId } },
                        { $group: { _id: null, quantity: { $sum: "$baseQuantity" } } }
                    ], { session }).toArray();
                    const returnedForBatch = Number(previouslyReturned[0]?.quantity || 0);
                    const availableFromMovement = Math.max(Number(movement.quantity) - returnedForBatch, 0);
                    const take = Math.min(remaining, availableFromMovement);
                    if (take <= 0) continue;
                    const batch = await batches.findOne({ _id: movement.batchId, tenantId: tenant, productId, branchId: text(branchId) }, { session });
                    if (!batch) fail("Original sale batch no longer exists.", 409);
                    const cost = Number(movement.unitCost ?? batch.costPrice);
                    if (!Number.isFinite(cost) || cost < 0) fail("Original sale cost basis is missing; return cannot be posted safely.", 409);
                    const pricePerBase = Number(original.lineTotal) / Number(original.baseQuantity);
                    const batchRefundMinor = toMinorUnits((pricePerBase * take).toFixed(2));
                    lineRefundMinor += batchRefundMinor;
                    cogsMinor += toMinorUnits((cost * take).toFixed(2));
                    await batches.updateOne({ _id: batch._id, tenantId: tenant, productId, branchId: text(branchId) }, { $inc: { quantity: take }, $set: { updatedAt: now } }, { session });
                    await movements.insertOne({ tenantId: tenant, branchId: text(branchId), productId, batchId: batch._id, type: "RETURN", quantity: take, direction: "IN", reference: `RETURN:${key}`, notes: text(reason), unitCost: cost, createdBy, createdAt: now }, { session });
                    remaining -= take;
                }
                if (remaining > 0) fail("Original sale stock movement cannot support the requested return.", 409);
                const productUpdate = await products.updateOne({ _id: productId, tenantId: tenant }, { $inc: { stockQuantity: requestedBaseQuantity }, $set: { updatedAt: now } }, { session });
                if (!productUpdate.modifiedCount) fail("Product stock record could not be restored.", 409);
                refundMinor += lineRefundMinor;
                const itemDoc = { tenantId: tenant, saleId: saleObjectId, productId, baseQuantity: requestedBaseQuantity, refund: fromMinorUnits(lineRefundMinor), reason: text(reason), createdAt: now };
                const inserted = await returnItems.insertOne(itemDoc, { session });
                createdItems.push({ ...itemDoc, _id: inserted.insertedId });
            }

            const refund = fromMinorUnits(refundMinor);
            if (refundMinor <= 0n) fail("Return refund amount must be greater than zero.");
            const returnDoc = { tenantId: tenant, branchId: text(branchId), saleId: saleObjectId, refundPaymentMethod: text(refundPaymentMethod).toUpperCase(), refund, status: "COMPLETED", reason: text(reason), idempotencyKey: key, createdBy, createdAt: now };
            const returnResult = await returns.insertOne(returnDoc, { session });
            const lines = [
                { account: "4000", side: "DEBIT", amount: refund, memo: "Sales return / revenue reversal" },
                { account: refundAccountCode, side: "CREDIT", amount: refund, memo: "Customer refund" }
            ];
            if (cogsMinor > 0n) {
                lines.push({ account: "1200", side: "DEBIT", amount: fromMinorUnits(cogsMinor), memo: "Inventory restored" });
                lines.push({ account: "5000", side: "CREDIT", amount: fromMinorUnits(cogsMinor), memo: "COGS reversal" });
            }
            const journal = await postJournalInSession({ session, tenantId: tenant, branchId: text(branchId), currency: "TZS", referenceType: "SALE_RETURN", referenceId: String(returnResult.insertedId), idempotencyKey: `SALE_RETURN:${key}`, description: `Return against sale ${saleObjectId}`, lines });
            result = { return: { ...returnDoc, _id: returnResult.insertedId, ledgerJournalId: journal.journal._id }, items: createdItems, journal: journal.journal, duplicate: false };
        });
        return result;
    } finally { await session.endSession(); }
}

export async function getSaleReturnById({ tenantId, returnId } = {}) {
    const tenant = text(tenantId);
    if (!tenant) fail("Tenant context is required.", 403);
    return getCollection(COLLECTIONS.RETURNS).findOne({ _id: objectId(returnId, "return ID"), tenantId: tenant });
}
