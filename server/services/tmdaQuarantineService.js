import { ObjectId } from "mongodb";
import { getMongoClient } from "../database/mongo.js";
import { COLLECTIONS } from "../../shared/schemas/index.js";

export const QUARANTINE_STATUSES = Object.freeze([
    "QUARANTINED",
    "RELEASED",
    "DISPOSED"
]);

export const QUARANTINE_REASONS = Object.freeze([
    "EXPIRED",
    "DAMAGED",
    "RECALL",
    "SUSPECT",
    "REGULATORY_HOLD",
    "OTHER"
]);

export const DISPOSITION_TYPES = Object.freeze([
    "RETURN_SUPPLIER",
    "DESTROY",
    "AUTHORISED_RELEASE",
    "OTHER"
]);

function text(value) { return String(value ?? "").trim(); }
function fail(message, statusCode = 400) { const error = new Error(message); error.statusCode = statusCode; throw error; }
function validDate(value) { const date = new Date(value); return !Number.isNaN(date.getTime()); }

export function validateQuarantineRecord(input = {}) {
    const errors = [];
    if (!text(input.tenantId)) errors.push("tenantId is required.");
    if (!ObjectId.isValid(input.productId)) errors.push("productId must be a valid id.");
    if (!ObjectId.isValid(input.batchId)) errors.push("batchId must be a valid id.");
    if (!QUARANTINE_REASONS.includes(text(input.reason))) errors.push("reason is unsupported.");
    if (input.quantity === undefined || !Number.isFinite(Number(input.quantity)) || Number(input.quantity) <= 0) errors.push("quantity must be greater than zero.");
    if (input.quarantineDate !== undefined && !validDate(input.quarantineDate)) errors.push("quarantineDate must be a valid date.");
    if (input.status !== undefined && !QUARANTINE_STATUSES.includes(text(input.status))) errors.push("status is unsupported.");
    if (input.disposition !== undefined && !DISPOSITION_TYPES.includes(text(input.disposition))) errors.push("disposition is unsupported.");
    return { valid: errors.length === 0, errors };
}

export function validateDispositionTransition({ status, disposition, authorisedBy, notes } = {}) {
    const errors = [];
    if (!QUARANTINE_STATUSES.includes(text(status))) errors.push("Current quarantine status is invalid.");
    if (!DISPOSITION_TYPES.includes(text(disposition))) errors.push("disposition is unsupported.");
    if (status !== "QUARANTINED") errors.push("Only QUARANTINED stock may receive a disposition.");
    if (!text(authorisedBy)) errors.push("authorisedBy is required for disposition.");
    if (disposition === "OTHER" && !text(notes)) errors.push("notes are required when disposition is OTHER.");
    return { valid: errors.length === 0, errors };
}

export async function createQuarantineRecord(input = {}) {
    const validation = validateQuarantineRecord(input);
    if (!validation.valid) fail(validation.errors.join(" "));

    const tenantId = text(input.tenantId);
    const productId = new ObjectId(input.productId);
    const batchId = new ObjectId(input.batchId);
    const quantity = Number(input.quantity);
    const client = getMongoClient();
    const db = client.db();
    const session = client.startSession();

    try {
        let created;
        await session.withTransaction(async () => {
            const products = db.collection(COLLECTIONS.PRODUCTS);
            const batches = db.collection(COLLECTIONS.BATCHES);
            const quarantines = db.collection(COLLECTIONS.TMDA_QUARANTINES);
            const movements = db.collection(COLLECTIONS.STOCK_MOVEMENTS);

            const product = await products.findOne({ _id: productId, tenantId }, { session });
            if (!product) fail("Product not found for tenant.", 404);

            const batch = await batches.findOne({ _id: batchId, tenantId, productId }, { session });
            if (!batch) fail("Batch not found for tenant and product.", 404);

            const currentBatchQuantity = Number(batch.quantity || 0);
            const currentProductQuantity = Number(product.stockQuantity || 0);
            if (currentBatchQuantity < quantity || currentProductQuantity < quantity) {
                fail("Insufficient saleable stock for quarantine.", 409);
            }

            const now = new Date();
            const branchId = text(input.branchId || batch.branchId) || null;
            const reference = `TMDA-QUARANTINE:${batchId.toString()}`;
            const record = {
                tenantId,
                productId,
                batchId,
                quantity,
                reason: text(input.reason),
                status: "QUARANTINED",
                quarantineDate: input.quarantineDate ? new Date(input.quarantineDate) : now,
                disposition: null,
                dispositionDate: null,
                authorisedBy: null,
                notes: text(input.notes) || null,
                branchId,
                createdAt: now,
                updatedAt: now
            };

            const batchResult = await batches.updateOne(
                { _id: batchId, tenantId, productId, quantity: { $gte: quantity } },
                { $inc: { quantity: -quantity }, $set: { updatedAt: now } },
                { session }
            );
            if (!batchResult.modifiedCount) fail("Batch stock changed before quarantine could be applied.", 409);

            const productResult = await products.updateOne(
                { _id: productId, tenantId, stockQuantity: { $gte: quantity } },
                { $inc: { stockQuantity: -quantity }, $set: { updatedAt: now } },
                { session }
            );
            if (!productResult.modifiedCount) fail("Product stock changed before quarantine could be applied.", 409);

            const movement = {
                tenantId,
                productId,
                batchId,
                type: text(input.reason) === "DAMAGED" ? "DAMAGE" : text(input.reason) === "EXPIRED" ? "EXPIRED" : "ADJUSTMENT",
                quantity,
                direction: "OUT",
                branchId,
                reference,
                notes: `TMDA quarantine: ${text(input.reason)}`,
                createdBy: text(input.createdBy) || null,
                createdAt: now
            };
            const movementResult = await movements.insertOne(movement, { session });
            const quarantineResult = await quarantines.insertOne({ ...record, movementId: movementResult.insertedId }, { session });
            created = { ...record, movementId: movementResult.insertedId, _id: quarantineResult.insertedId };
        });
        return created;
    } finally {
        await session.endSession();
    }
}

export async function applyQuarantineDisposition({ tenantId, quarantineId, disposition, authorisedBy, notes, createdBy = null } = {}) {
    if (!text(tenantId)) fail("Tenant context is required.", 403);
    if (!ObjectId.isValid(quarantineId)) fail("Invalid quarantine id.");

    const tenant = text(tenantId);
    const qid = new ObjectId(quarantineId);
    const client = getMongoClient();
    const db = client.db();
    const session = client.startSession();

    try {
        let resultRecord;
        await session.withTransaction(async () => {
            const quarantines = db.collection(COLLECTIONS.TMDA_QUARANTINES);
            const batches = db.collection(COLLECTIONS.BATCHES);
            const products = db.collection(COLLECTIONS.PRODUCTS);
            const movements = db.collection(COLLECTIONS.STOCK_MOVEMENTS);

            const current = await quarantines.findOne({ _id: qid, tenantId: tenant }, { session });
            if (!current) fail("Quarantine record not found.", 404);

            const validation = validateDispositionTransition({ status: current.status, disposition, authorisedBy, notes });
            if (!validation.valid) fail(validation.errors.join(" "));

            const productId = current.productId;
            const batchId = current.batchId;
            const quantity = Number(current.quantity || 0);
            const nextStatus = disposition === "AUTHORISED_RELEASE" ? "RELEASED" : "DISPOSED";
            const now = new Date();
            const branchId = text(current.branchId) || null;

            const product = await products.findOne({ _id: productId, tenantId: tenant }, { session });
            const batch = await batches.findOne({ _id: batchId, tenantId: tenant, productId }, { session });
            if (!product || !batch) fail("Quarantine stock references no longer resolve to the tenant inventory.", 409);

            if (nextStatus === "RELEASED") {
                const batchResult = await batches.updateOne(
                    { _id: batchId, tenantId: tenant, productId },
                    { $inc: { quantity }, $set: { updatedAt: now } },
                    { session }
                );
                if (!batchResult.modifiedCount) fail("Could not restore quarantined batch stock.", 409);

                const productResult = await products.updateOne(
                    { _id: productId, tenantId: tenant },
                    { $inc: { stockQuantity: quantity }, $set: { updatedAt: now } },
                    { session }
                );
                if (!productResult.modifiedCount) fail("Could not restore quarantined product stock.", 409);
            }

            const movementType = nextStatus === "RELEASED" ? "RETURN" : "ADJUSTMENT";
            const movement = {
                tenantId: tenant,
                productId,
                batchId,
                type: movementType,
                quantity,
                direction: nextStatus === "RELEASED" ? "IN" : "OUT",
                branchId,
                reference: `TMDA-DISPOSITION:${qid.toString()}`,
                notes: `TMDA disposition: ${text(disposition)}`,
                createdBy: text(createdBy) || text(authorisedBy) || null,
                createdAt: now
            };
            const movementResult = await movements.insertOne(movement, { session });

            const updateResult = await quarantines.updateOne(
                { _id: qid, tenantId: tenant, status: "QUARANTINED" },
                { $set: { status: nextStatus, disposition: text(disposition), dispositionDate: now, authorisedBy: text(authorisedBy), notes: text(notes) || current.notes || null, updatedAt: now, dispositionMovementId: movementResult.insertedId } },
                { session }
            );
            if (!updateResult.modifiedCount) fail("Quarantine record changed before disposition could be applied.", 409);

            resultRecord = await quarantines.findOne({ _id: qid, tenantId: tenant }, { session });
        });
        return resultRecord;
    } finally {
        await session.endSession();
    }
}
