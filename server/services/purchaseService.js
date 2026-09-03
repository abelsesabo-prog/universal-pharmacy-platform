import { ObjectId } from "mongodb";
import { getCollection } from "./index.js";
import { getMongoClient } from "../database/mongo.js";
import { ensureDefaultBranch, requireActiveBranch } from "./branchService.js";
import { COLLECTIONS } from "../../shared/schemas/index.js";
import { ensureChartOfAccounts } from "./accountingCompletionService.js";
import { postJournalInSession, toMinorUnits, fromMinorUnits } from "./ledgerService.js";
import { assertPeriodOpen } from "./accountingPolicyService.js";

function fail(message, statusCode = 400) { const error = new Error(message); error.statusCode = statusCode; throw error; }
function text(value) { return String(value ?? "").trim(); }
function positive(value, label) { const n = Number(value); if (!Number.isFinite(n) || n <= 0) fail(`${label} must be greater than zero.`); return n; }
function objectId(value, label) { if (!ObjectId.isValid(value)) fail(`Invalid ${label}.`); return new ObjectId(value); }
function date(value, label) { const d = new Date(value); if (!value || Number.isNaN(d.getTime())) fail(`${label} is invalid.`); return d; }

const PAYMENT_ACCOUNTS = Object.freeze({
    CASH: "1000",
    BANK: "1010",
    MPESA: "1020",
    MIXX: "1020",
    AIRTEL: "1020",
    HALOPESA: "1020",
    TPESA: "1020",
    CREDIT: "2000"
});

function paymentAccount(paymentMethod) {
    const normalized = text(paymentMethod).toUpperCase().replace(/[\s-]+/g, "_");
    const aliases = { "M_PESA": "MPESA", "MIX_X": "MIXX", "MIX_BY_YAS": "MIXX", "AIRTEL_MONEY": "AIRTEL", "HALO_PESA": "HALOPESA", "T_PESA": "TPESA", "ACCOUNTS_PAYABLE": "CREDIT", "CREDIT_PURCHASE": "CREDIT" };
    const key = aliases[normalized] || normalized;
    const account = PAYMENT_ACCOUNTS[key];
    if (!account) fail("Unsupported purchase payment method.");
    return { key, account };
}

function normalizeItem(item, index) {
    const productId = objectId(item?.productId, `product ID at item ${index + 1}`);
    const batchNumber = text(item?.batchNumber);
    if (!batchNumber) fail(`Batch number is required at item ${index + 1}.`);
    const quantity = positive(item?.quantity, `Quantity at item ${index + 1}`);
    const conversionToBase = positive(item?.conversionToBase ?? 1, `Conversion to base at item ${index + 1}`);
    const unitCost = text(item?.unitCost) || "";
    toMinorUnits(unitCost);
    const expiryDate = date(item?.expiryDate, `Expiry date at item ${index + 1}`);
    if (expiryDate < new Date(new Date().setHours(0, 0, 0, 0))) fail(`Item ${index + 1} is already expired.`);
    return { productId, batchNumber, quantity, conversionToBase, unitCost, expiryDate, uom: text(item?.uom) || "piece", supplierId: text(item?.supplierId) || null };
}

export async function receivePurchase({ tenantId, branchId = null, supplierId = null, invoiceNumber, paymentMethod = "CREDIT", occurredAt = new Date(), idempotencyKey, createdBy = null, items = [], note = null } = {}) {
    const tenant = text(tenantId);
    if (!tenant) fail("Tenant context is required.", 403);
    if (!text(idempotencyKey)) fail("Purchase idempotency key is required.");
    const invoice = text(invoiceNumber);
    if (!invoice) fail("Supplier invoice number is required.");
    if (!Array.isArray(items) || !items.length) fail("At least one purchase item is required.");
    const occurred = date(occurredAt, "Purchase date");
    const normalizedItems = items.map(normalizeItem);
    const payment = paymentAccount(paymentMethod);
    const activeBranch = text(branchId) || (await ensureDefaultBranch(tenant)).branchId;
    await requireActiveBranch(tenant, activeBranch);
    assertPeriodOpen({ at: occurred });
    await ensureChartOfAccounts(tenant);

    const client = getMongoClient();
    const db = client.db();
    const session = client.startSession();
    try {
        let result;
        await session.withTransaction(async () => {
            const purchases = db.collection(COLLECTIONS.PURCHASES);
            const purchaseItems = db.collection(COLLECTIONS.PURCHASE_ITEMS);
            const products = db.collection(COLLECTIONS.PRODUCTS);
            const batches = db.collection(COLLECTIONS.BATCHES);
            const movements = db.collection(COLLECTIONS.STOCK_MOVEMENTS);
            const existing = await purchases.findOne({ tenantId: tenant, idempotencyKey }, { session });
            if (existing) { result = { purchase: existing, duplicate: true }; return; }

            await purchases.createIndex({ tenantId: 1, idempotencyKey: 1 }, { unique: true, name: "purchase_tenant_idempotency_unique" });
            const now = new Date();
            let totalMinor = 0n;
            const createdItems = [];
            for (const item of normalizedItems) {
                const product = await products.findOne({ _id: item.productId, tenantId: tenant }, { session });
                if (!product) fail("Product not found in this tenant.", 404);
                const lineMinor = toMinorUnits(item.unitCost) * BigInt(Math.round(item.quantity));
                totalMinor += lineMinor;
                const baseQuantity = item.quantity * item.conversionToBase;
                const batch = { tenantId: tenant, productId: item.productId, batchNumber: item.batchNumber, quantity: baseQuantity, expiryDate: item.expiryDate, branchId: activeBranch, costPrice: Number(item.unitCost) / item.conversionToBase, sellingPrice: null, supplierId: item.supplierId || text(supplierId) || null, createdBy, createdAt: now, updatedAt: now };
                const batchResult = await batches.insertOne(batch, { session });
                await products.updateOne({ _id: item.productId, tenantId: tenant }, { $inc: { stockQuantity: baseQuantity }, $set: { updatedAt: now } }, { session });
                await movements.insertOne({ tenantId: tenant, productId: item.productId, batchId: batchResult.insertedId, type: "PURCHASE", quantity: baseQuantity, direction: "IN", branchId: activeBranch, reference: `PURCHASE:${invoice}`, notes: note ? text(note) : "Supplier purchase received", unitCost: Number(item.unitCost) / item.conversionToBase, createdBy, createdAt: now }, { session });
                const purchaseItem = { tenantId: tenant, productId: item.productId, batchId: batchResult.insertedId, quantity: item.quantity, baseQuantity, uom: item.uom, conversionToBase: item.conversionToBase, unitCost: Number(item.unitCost), lineTotal: fromMinorUnits(lineMinor), batchNumber: item.batchNumber, expiryDate: item.expiryDate, createdAt: now };
                const itemResult = await purchaseItems.insertOne(purchaseItem, { session });
                createdItems.push({ ...purchaseItem, _id: itemResult.insertedId });
            }

            const total = fromMinorUnits(totalMinor);
            const purchaseDoc = { tenantId: tenant, branchId: activeBranch, supplierId: text(supplierId) || null, invoiceNumber: invoice, paymentMethod: payment.key, total, status: "RECEIVED", occurredAt: occurred, createdBy, note: text(note) || null, itemCount: createdItems.length, idempotencyKey, createdAt: now, updatedAt: now };
            const purchaseResult = await purchases.insertOne(purchaseDoc, { session });
            const journal = await postJournalInSession({
                session,
                tenantId: tenant,
                branchId: activeBranch,
                currency: "TZS",
                referenceType: "PURCHASE",
                referenceId: String(purchaseResult.insertedId),
                idempotencyKey: `PURCHASE:${idempotencyKey}`,
                description: `Supplier purchase ${invoice}`,
                lines: [
                    { account: "1200", side: "DEBIT", amount: total },
                    { account: payment.account, side: "CREDIT", amount: total }
                ]
            });
            result = { purchase: { ...purchaseDoc, _id: purchaseResult.insertedId }, items: createdItems, journal: journal.journal, duplicate: false };
        });
        return result;
    } finally { await session.endSession(); }
}

export async function getPurchaseById({ tenantId, purchaseId } = {}) {
    const tenant = text(tenantId);
    if (!tenant) fail("Tenant context is required.", 403);
    return getCollection(COLLECTIONS.PURCHASES).findOne({ _id: objectId(purchaseId, "purchase ID"), tenantId: tenant });
}
