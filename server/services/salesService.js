import { ObjectId } from "mongodb";
import { getMongoClient } from "../database/mongo.js";
import { getCollection } from "./index.js";
import { requireActiveBranch } from "./branchService.js";
import { COLLECTIONS } from "../../shared/schemas/index.js";

function fail(message, statusCode = 400) { const error = new Error(message); error.statusCode = statusCode; throw error; }
function id(value, label) { if (!ObjectId.isValid(value)) fail(`Invalid ${label}.`); return new ObjectId(value); }
function qty(value) { const n = Number(value); if (!Number.isFinite(n) || n <= 0) fail("Sale quantity must be greater than zero."); return n; }

export async function createSale({ tenantId, branchId, items = [], payments = [], customerId = null, cashierId = null, discount = 0 }) {
    if (!tenantId) fail("Tenant context is required.", 403);
    const branch = String(branchId || "").trim();
    await requireActiveBranch(tenantId, branch);
    if (!Array.isArray(items) || items.length === 0) fail("At least one sale item is required.");
    if (!Array.isArray(payments) || payments.length === 0) fail("At least one payment is required.");
    const discountValue = Number(discount) || 0;
    if (!Number.isFinite(discountValue) || discountValue < 0) fail("Discount must be zero or greater.");

    const client = getMongoClient();
    const db = client.db();
    const session = client.startSession();
    try {
        let sale;
        await session.withTransaction(async () => {
            const products = db.collection(COLLECTIONS.PRODUCTS);
            const batches = db.collection(COLLECTIONS.BATCHES);
            const sales = db.collection(COLLECTIONS.SALES);
            const saleItems = db.collection(COLLECTIONS.SALE_ITEMS);
            const movements = db.collection(COLLECTIONS.STOCK_MOVEMENTS);
            const normalizedItems = [];
            let subtotal = 0;

            for (const raw of items) {
                const productId = id(raw.productId, "product ID");
                const quantity = qty(raw.quantity);
                const product = await products.findOne({ _id: productId, tenantId }, { session });
                if (!product) fail("One or more products are not available in this tenant.", 404);
                const unitPrice = Number(raw.unitPrice ?? 0);
                if (!Number.isFinite(unitPrice) || unitPrice < 0) fail("Unit price must be zero or greater.");
                const lineTotal = unitPrice * quantity;
                subtotal += lineTotal;
                normalizedItems.push({ productId, productName: product.brandName || product.genericName, quantity, unitPrice, lineTotal, requestedBatchId: raw.batchId ? id(raw.batchId, "batch ID") : null, uom: raw.uom || product.baseUnit || "UNIT" });
            }

            const total = Math.max(subtotal - discountValue, 0);
            const paymentTotal = payments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
            if (!Number.isFinite(paymentTotal) || Math.abs(paymentTotal - total) > 0.0001) fail(`Payment total must equal sale total (${total}).`);

            const now = new Date();
            const today = new Date(); today.setHours(0, 0, 0, 0);
            const saleDoc = { tenantId, branchId: branch, customerId: customerId ? String(customerId).trim() : null, cashierId: cashierId ? String(cashierId).trim() : null, subtotal, discount: discountValue, total, payments: payments.map(payment => ({ method: String(payment.method || "").trim().toUpperCase(), provider: payment.provider ? String(payment.provider).trim().toUpperCase() : null, amount: Number(payment.amount), currency: String(payment.currency || "TZS").trim().toUpperCase() })), status: "COMPLETED", createdAt: now };
            const saleResult = await sales.insertOne(saleDoc, { session });

            for (const item of normalizedItems) {
                let remaining = item.quantity;
                const batchFilter = item.requestedBatchId ? { _id: item.requestedBatchId, tenantId, productId: item.productId, branchId: branch, quantity: { $gt: 0 }, expiryDate: { $gte: today } } : { tenantId, productId: item.productId, branchId: branch, quantity: { $gt: 0 }, expiryDate: { $gte: today } };
                const availableBatches = await batches.find(batchFilter, { session }).sort({ expiryDate: 1, createdAt: 1 }).toArray();
                for (const batch of availableBatches) {
                    if (remaining <= 0) break;
                    const take = Math.min(remaining, Number(batch.quantity));
                    if (take <= 0) continue;
                    const result = await batches.updateOne({ _id: batch._id, tenantId, productId: item.productId, branchId: branch, quantity: { $gte: take } }, { $inc: { quantity: -take }, $set: { updatedAt: new Date() } }, { session });
                    if (!result.modifiedCount) continue;
                    await movements.insertOne({ tenantId, branchId: branch, productId: item.productId, batchId: batch._id, type: "SALE", quantity: take, direction: "OUT", reference: `SALE:${saleResult.insertedId}`, unitCost: batch.costPrice ?? null, createdAt: new Date() }, { session });
                    remaining -= take;
                }
                if (remaining > 0) fail(`Insufficient unexpired stock for ${item.productName}.`, 409);
                const productUpdate = await products.updateOne({ _id: item.productId, tenantId, stockQuantity: { $gte: item.quantity } }, { $inc: { stockQuantity: -item.quantity }, $set: { updatedAt: new Date() } }, { session });
                if (!productUpdate.modifiedCount) fail(`Product stock is inconsistent for ${item.productName}.`, 409);
                await saleItems.insertOne({ tenantId, saleId: saleResult.insertedId, productId: item.productId, productName: item.productName, quantity: item.quantity, unitPrice: item.unitPrice, lineTotal: item.lineTotal, uom: item.uom, createdAt: new Date() }, { session });
            }
            sale = { ...saleDoc, _id: saleResult.insertedId };
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
