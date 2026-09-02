import { ObjectId } from "mongodb";
import { getDatabase } from "../database/mongo.js";
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
    if (["DISPOSED", "RELEASED"].includes(status)) errors.push("A finalized quarantine record cannot be finalized again.");
    if (!text(authorisedBy)) errors.push("authorisedBy is required for disposition.");
    if (disposition === "OTHER" && !text(notes)) errors.push("notes are required when disposition is OTHER.");
    return { valid: errors.length === 0, errors };
}

export async function createQuarantineRecord(input = {}) {
    const validation = validateQuarantineRecord(input);
    if (!validation.valid) fail(validation.errors.join(" "));
    const tenantId = text(input.tenantId);
    const db = getDatabase();
    const batchId = new ObjectId(input.batchId);
    const productId = new ObjectId(input.productId);
    const batch = await db.collection(COLLECTIONS.BATCHES).findOne({ _id: batchId, tenantId, productId });
    if (!batch) fail("Batch not found for tenant and product.", 404);

    const now = new Date();
    const record = {
        tenantId,
        productId,
        batchId,
        quantity: Number(input.quantity),
        reason: text(input.reason),
        status: "QUARANTINED",
        quarantineDate: input.quarantineDate ? new Date(input.quarantineDate) : now,
        disposition: null,
        dispositionDate: null,
        authorisedBy: null,
        notes: text(input.notes) || null,
        createdAt: now,
        updatedAt: now
    };
    const result = await db.collection(COLLECTIONS.TMDA_QUARANTINES).insertOne(record);
    return { ...record, _id: result.insertedId };
}

export async function applyQuarantineDisposition({ tenantId, quarantineId, disposition, authorisedBy, notes } = {}) {
    if (!text(tenantId)) fail("Tenant context is required.", 403);
    if (!ObjectId.isValid(quarantineId)) fail("Invalid quarantine id.");
    const current = await getDatabase().collection(COLLECTIONS.TMDA_QUARANTINES).findOne({ _id: new ObjectId(quarantineId), tenantId: text(tenantId) });
    if (!current) fail("Quarantine record not found.", 404);
    const validation = validateDispositionTransition({ status: current.status, disposition, authorisedBy, notes });
    if (!validation.valid) fail(validation.errors.join(" "));

    const nextStatus = disposition === "AUTHORISED_RELEASE" ? "RELEASED" : "DISPOSED";
    const now = new Date();
    await getDatabase().collection(COLLECTIONS.TMDA_QUARANTINES).updateOne(
        { _id: current._id, tenantId: text(tenantId), status: "QUARANTINED" },
        { $set: { status: nextStatus, disposition: text(disposition), dispositionDate: now, authorisedBy: text(authorisedBy), notes: text(notes) || current.notes || null, updatedAt: now } }
    );
    return getDatabase().collection(COLLECTIONS.TMDA_QUARANTINES).findOne({ _id: current._id, tenantId: text(tenantId) });
}
