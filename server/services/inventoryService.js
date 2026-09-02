import { ObjectId } from "mongodb";
import { getCollection } from "./index.js";
import { getMongoClient } from "../database/mongo.js";
import { ensureDefaultBranch, requireActiveBranch } from "./branchService.js";
import { COLLECTIONS, STOCK_MOVEMENT_TYPES } from "../../shared/schemas/index.js";

function fail(message, statusCode = 400) { const error = new Error(message); error.statusCode = statusCode; throw error; }
function objectId(value, label) { if (!ObjectId.isValid(value)) fail(`Invalid ${label}.`); return new ObjectId(value); }
function positiveNumber(value, label) { const n = Number(value); if (!Number.isFinite(n) || n <= 0) fail(`${label} must be greater than zero.`); return n; }
function futureOrToday(dateValue) { const date = new Date(dateValue); if (!dateValue || Number.isNaN(date.getTime())) fail("Expiry date is invalid."); const today = new Date(); today.setHours(0,0,0,0); if (date < today) fail("Cannot add stock with an already expired date."); return date; }

export async function createBatch({ tenantId, productId, batchNumber, quantity, expiryDate, branchId = null, costPrice = null, sellingPrice = null, location = null, supplierId = null, createdBy = null }) {
    const productObjectId = objectId(productId, "product ID");
    const qty = positiveNumber(quantity, "Quantity");
    const expiry = futureOrToday(expiryDate);
    const number = String(batchNumber || "").trim();
    if (!number) fail("Batch number is required.");
    const branch = String(branchId || "").trim();
    const activeBranch = branch || (await ensureDefaultBranch(tenantId)).branchId;
    await requireActiveBranch(tenantId, activeBranch);
    const cost = costPrice == null || costPrice === "" ? null : Number(costPrice);
    const price = sellingPrice == null || sellingPrice === "" ? null : Number(sellingPrice);
    if (cost != null && (!Number.isFinite(cost) || cost < 0)) fail("Cost price must be zero or greater.");
    if (price != null && (!Number.isFinite(price) || price < 0)) fail("Selling price must be zero or greater.");

    const client = getMongoClient();
    const db = client.db();
    const session = client.startSession();
    try {
        let created;
        await session.withTransaction(async () => {
            const products = db.collection(COLLECTIONS.PRODUCTS);
            const batches = db.collection(COLLECTIONS.BATCHES);
            const movements = db.collection(COLLECTIONS.STOCK_MOVEMENTS);
            const product = await products.findOne({ _id: productObjectId, tenantId }, { session });
            if (!product) fail("Product not found in this tenant.", 404);
            const now = new Date();
            const batch = { tenantId, productId: productObjectId, batchNumber: number, quantity: qty, expiryDate: expiry, branchId: activeBranch, costPrice: cost, sellingPrice: price, location: location ? String(location).trim() : null, supplierId: supplierId ? String(supplierId).trim() : null, createdBy, createdAt: now, updatedAt: now };
            const result = await batches.insertOne(batch, { session });
            await products.updateOne({ _id: productObjectId, tenantId }, { $inc: { stockQuantity: qty }, $set: { updatedAt: now } }, { session });
            await movements.insertOne({ tenantId, productId: productObjectId, batchId: result.insertedId, type: "PURCHASE", quantity: qty, direction: "IN", branchId: activeBranch, reference: `BATCH:${result.insertedId}`, notes: "Initial batch stock received", unitCost: cost, createdBy, createdAt: now }, { session });
            created = { ...batch, _id: result.insertedId };
        });
        return created;
    } finally { await session.endSession(); }
}

export async function listBatches({ tenantId, productId, branchId, limit = 100, skip = 0 } = {}) {
    const filter = { tenantId };
    if (productId) filter.productId = objectId(productId, "product ID");
    if (branchId) filter.branchId = String(branchId).trim();
    const safeLimit = Math.min(Math.max(Number(limit) || 100, 1), 200);
    const safeSkip = Math.max(Number(skip) || 0, 0);
    return getCollection(COLLECTIONS.BATCHES).find(filter).sort({ expiryDate: 1, createdAt: -1 }).skip(safeSkip).limit(safeLimit).toArray();
}

export async function listStockMovements({ tenantId, productId, limit = 100, skip = 0 } = {}) {
    const filter = { tenantId };
    if (productId) filter.productId = objectId(productId, "product ID");
    const safeLimit = Math.min(Math.max(Number(limit) || 100, 1), 200);
    const safeSkip = Math.max(Number(skip) || 0, 0);
    return getCollection(COLLECTIONS.STOCK_MOVEMENTS).find(filter).sort({ createdAt: -1 }).skip(safeSkip).limit(safeLimit).toArray();
}

export async function recordStockAdjustment({ tenantId, productId, type = "ADJUSTMENT", quantity, direction, batchId = null, branchId = null, reference = null, notes = null, unitCost = null, createdBy = null }) {
    if (!STOCK_MOVEMENT_TYPES.includes(String(type).toUpperCase())) fail("Invalid stock movement type.");
    const qty = positiveNumber(quantity, "Quantity");
    const dir = String(direction || "").toUpperCase();
    if (!["IN", "OUT"].includes(dir)) fail("Direction must be IN or OUT.");
    const productObjectId = objectId(productId, "product ID");
    const batchObjectId = batchId ? objectId(batchId, "batch ID") : null;
    const activeBranch = String(branchId || "").trim() || (await ensureDefaultBranch(tenantId)).branchId;
    await requireActiveBranch(tenantId, activeBranch);
    const delta = dir === "IN" ? qty : -qty;
    const client = getMongoClient();
    const db = client.db();
    const session = client.startSession();
    try {
        let movement;
        await session.withTransaction(async () => {
            const products = db.collection(COLLECTIONS.PRODUCTS);
            const movements = db.collection(COLLECTIONS.STOCK_MOVEMENTS);
            const product = await products.findOne({ _id: productObjectId, tenantId }, { session });
            if (!product) fail("Product not found in this tenant.", 404);
            if (dir === "OUT" && Number(product.stockQuantity || 0) < qty) fail("Insufficient stock.", 409);
            const now = new Date();
            await products.updateOne({ _id: productObjectId, tenantId }, { $inc: { stockQuantity: delta }, $set: { updatedAt: now } }, { session });
            if (batchObjectId) {
                const batchResult = await db.collection(COLLECTIONS.BATCHES).updateOne({ _id: batchObjectId, tenantId, productId: productObjectId, branchId: activeBranch, ...(dir === "OUT" ? { quantity: { $gte: qty } } : {}) }, { $inc: { quantity: delta }, $set: { updatedAt: now } }, { session });
                if (!batchResult.matchedCount) fail(dir === "OUT" ? "Batch has insufficient stock or is not found." : "Batch not found.", 409);
            }
            const doc = { tenantId, productId: productObjectId, type: String(type).toUpperCase(), quantity: qty, direction: dir, batchId: batchObjectId, branchId: activeBranch, reference: reference ? String(reference).trim() : null, notes: notes ? String(notes).trim() : null, unitCost: unitCost == null ? null : Number(unitCost), createdBy, createdAt: now };
            const result = await movements.insertOne(doc, { session });
            movement = { ...doc, _id: result.insertedId };
        });
        return movement;
    } finally { await session.endSession(); }
}
