import { randomUUID } from "node:crypto";
import { getDatabase } from "../database/mongo.js";
import { COLLECTIONS, OFFLINE_EVENT_STATUSES } from "../../shared/schemas/index.js";

const EVENT_TYPES = Object.freeze(["SALE", "PURCHASE", "STOCK_ADJUSTMENT", "TRANSFER", "CUSTOMER_UPDATE", "COMPLAINT", "EXPENSE"]);

function fail(message, statusCode = 400) { const error = new Error(message); error.statusCode = statusCode; throw error; }
function text(value) { return String(value ?? "").trim(); }

export function validateOfflineEvent(input = {}) {
    const errors = [];
    if (!text(input.eventId)) errors.push("eventId is required.");
    if (!text(input.tenantId)) errors.push("tenantId is required.");
    if (!text(input.deviceId)) errors.push("deviceId is required.");
    if (!EVENT_TYPES.includes(text(input.eventType))) errors.push("eventType is unsupported.");
    const occurredAt = new Date(input.occurredAt);
    if (Number.isNaN(occurredAt.getTime())) errors.push("occurredAt must be a valid date.");
    if (!input.payload || typeof input.payload !== "object" || Array.isArray(input.payload)) errors.push("payload must be an object.");
    return { valid: errors.length === 0, errors };
}

export async function appendOfflineEvent(input = {}) {
    const event = { ...input, eventId: text(input.eventId) || randomUUID(), status: "PENDING" };
    const validation = validateOfflineEvent(event);
    if (!validation.valid) fail(validation.errors.join(" "));
    const db = getDatabase();
    const now = new Date();
    const document = { ...event, tenantId: text(event.tenantId), deviceId: text(event.deviceId), eventType: text(event.eventType), occurredAt: new Date(event.occurredAt), receivedAt: now };
    try {
        await db.collection(COLLECTIONS.OFFLINE_EVENTS).insertOne(document);
        return { accepted: true, duplicate: false, event: document };
    } catch (error) {
        if (error?.code === 11000) {
            const existing = await db.collection(COLLECTIONS.OFFLINE_EVENTS).findOne({ tenantId: document.tenantId, eventId: document.eventId });
            if (existing) return { accepted: true, duplicate: true, event: existing };
        }
        throw error;
    }
}

export async function getPendingOfflineEvents(tenantId, deviceId, limit = 100) {
    if (!text(tenantId) || !text(deviceId)) fail("tenantId and deviceId are required.");
    const safeLimit = Math.min(Math.max(Number(limit) || 100, 1), 500);
    return getDatabase().collection(COLLECTIONS.OFFLINE_EVENTS).find({ tenantId: text(tenantId), deviceId: text(deviceId), status: "PENDING" }).sort({ occurredAt: 1, receivedAt: 1 }).limit(safeLimit).toArray();
}

export async function markOfflineEvent(eventId, tenantId, status, error = null) {
    if (!OFFLINE_EVENT_STATUSES.includes(status)) fail("Invalid offline event status.");
    if (!text(eventId) || !text(tenantId)) fail("eventId and tenantId are required.");
    const update = { status, processedAt: new Date() };
    if (error) update.error = text(error);
    const result = await getDatabase().collection(COLLECTIONS.OFFLINE_EVENTS).updateOne({ eventId: text(eventId), tenantId: text(tenantId) }, { $set: update });
    if (!result.matchedCount) fail("Offline event not found.", 404);
    return result;
}

export { EVENT_TYPES };
