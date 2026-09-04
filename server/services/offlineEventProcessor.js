import { ObjectId } from "mongodb";
import { getMongoClient } from "../database/mongo.js";
import { COLLECTIONS } from "../../shared/schemas/index.js";
import { getPendingOfflineEvents } from "./offlineEventLedger.js";

export const REPLAY_PHASES = Object.freeze(["VALIDATED", "RESOLVED", "APPLIED", "AUDITED", "ACKNOWLEDGED"]);

function text(value) { return String(value ?? "").trim(); }
function fail(message, statusCode = 400) { const error = new Error(message); error.statusCode = statusCode; throw error; }
function productId(value) { return ObjectId.isValid(value) ? new ObjectId(value) : value; }

export function validateReplayEvent(event) {
    const errors = [];
    if (!event || typeof event !== "object") return { valid: false, errors: ["Offline event is required."] };
    if (!text(event.eventId)) errors.push("eventId is required.");
    if (!text(event.tenantId)) errors.push("tenantId is required.");
    if (!text(event.eventType)) errors.push("eventType is required.");
    if (!event.payload || typeof event.payload !== "object" || Array.isArray(event.payload)) errors.push("payload must be an object.");
    return { valid: errors.length === 0, errors };
}

async function writeReplayAudit(db, event, result, session) {
    await db.collection(COLLECTIONS.AUDIT_LOGS).insertOne({
        tenantId: event.tenantId,
        action: "OFFLINE_REPLAY",
        entity: result.entity || event.eventType,
        entityId: result.entityId || null,
        eventId: event.eventId,
        eventType: event.eventType,
        deviceId: event.deviceId || null,
        userId: event.userId || null,
        outcome: result.action,
        phases: [...REPLAY_PHASES],
        createdAt: new Date()
    }, { session });
}

async function applySale(db, event, session) {
    const payload = event.payload;
    const qty = Number(payload.quantity);
    const baseQuantity = Number(payload.baseQuantity ?? qty);
    if (!ObjectId.isValid(payload.productId)) fail("SALE replay requires a valid productId.");
    if (!Number.isFinite(qty) || qty <= 0) fail("SALE replay quantity must be greater than zero.");
    if (!Number.isFinite(baseQuantity) || baseQuantity <= 0) fail("SALE replay baseQuantity must be greater than zero.");

    const product = await db.collection(COLLECTIONS.PRODUCTS).findOne({ tenantId: event.tenantId, _id: productId(payload.productId) }, { session });
    if (!product) fail("SALE replay product was not found.", 404);
    if (Number(product.stockQuantity || 0) < baseQuantity) fail("SALE replay would create negative stock.", 409);

    const now = new Date(event.occurredAt);
    const lineTotal = Number(payload.lineTotal ?? 0);
    const unitPrice = Number(payload.unitPrice ?? 0);
    if (!Number.isFinite(lineTotal) || lineTotal < 0 || !Number.isFinite(unitPrice) || unitPrice < 0) fail("SALE replay contains invalid pricing.");

    const existingSale = await db.collection(COLLECTIONS.SALES).findOne({ tenantId: event.tenantId, offlineEventId: event.eventId }, { session });
    if (existingSale) {
        return { action: "ALREADY_APPLIED", entity: "SALE", entityId: String(existingSale._id), productId: String(product._id), baseQuantity };
    }

    const saleDocument = {
        tenantId: event.tenantId,
        branchId: text(payload.branchId || event.branchId) || null,
        offlineEventId: event.eventId,
        subtotal: lineTotal,
        total: lineTotal,
        payments: Array.isArray(payload.payments) ? payload.payments : [],
        status: "COMPLETED",
        cashierId: event.userId || null,
        customerId: payload.customerId || null,
        createdAt: now
    };
    const saleInsert = await db.collection(COLLECTIONS.SALES).insertOne(saleDocument, { session });
    const saleId = saleInsert.insertedId;

    await db.collection(COLLECTIONS.SALE_ITEMS).insertOne({
        tenantId: event.tenantId,
        saleId,
        productId: product._id,
        productName: product.brandName || product.genericName,
        quantity: qty,
        unitPrice,
        lineTotal,
        uom: text(payload.uom) || product.baseUnit || "piece",
        conversionToBase: Number(payload.conversionToBase || 1),
        baseQuantity,
        offlineEventId: event.eventId,
        createdAt: now
    }, { session });

    const stockResult = await db.collection(COLLECTIONS.PRODUCTS).updateOne(
        { _id: product._id, tenantId: event.tenantId, stockQuantity: { $gte: baseQuantity } },
        { $inc: { stockQuantity: -baseQuantity }, $set: { updatedAt: new Date() } },
        { session }
    );
    if (!stockResult.modifiedCount) fail("SALE replay could not decrement stock safely.", 409);

    await db.collection(COLLECTIONS.STOCK_MOVEMENTS).insertOne({
        tenantId: event.tenantId,
        productId: product._id,
        type: "SALE",
        quantity: baseQuantity,
        direction: "OUT",
        branchId: text(payload.branchId || event.branchId) || null,
        reference: `OFFLINE:${event.eventId}`,
        notes: "Replayed offline sale",
        createdBy: event.userId || null,
        createdAt: now,
        offlineEventId: event.eventId
    }, { session });
    return { action: "APPLIED", entity: "SALE", entityId: String(saleId), productId: String(product._id), baseQuantity };
}

export async function replayOfflineEvent(event, options = {}) {
    const validation = validateReplayEvent(event);
    if (!validation.valid) fail(validation.errors.join(" "));
    const client = getMongoClient();
    const session = client.startSession();
    try {
        let result;
        await session.withTransaction(async () => {
            const db = client.db();
            const ledger = db.collection(COLLECTIONS.OFFLINE_EVENTS);
            const current = await ledger.findOne({ tenantId: event.tenantId, eventId: event.eventId }, { session });
            if (!current) fail("Offline event was not found in the ledger.", 404);
            if (current.status !== "PENDING") {
                result = { action: current.status === "APPLIED" ? "ALREADY_APPLIED" : current.status, eventId: event.eventId };
                return;
            }
            if (current.eventType !== "SALE") fail(`Replay handler for event type '${current.eventType}' is not implemented yet.`, 422);
            result = await applySale(db, current, session);
            await writeReplayAudit(db, current, result, session);
            await ledger.updateOne(
                { tenantId: event.tenantId, eventId: event.eventId, status: "PENDING" },
                { $set: { status: "APPLIED", replayPhase: "ACKNOWLEDGED", processedAt: new Date(), processor: options.processor || "offline-event-processor" }, $unset: { error: "" } },
                { session }
            );
        });
        return { ...result, phases: [...REPLAY_PHASES] };
    } catch (error) {
        await client.db().collection(COLLECTIONS.OFFLINE_EVENTS).updateOne(
            { tenantId: event.tenantId, eventId: event.eventId, status: "PENDING" },
            { $set: { status: "REJECTED", replayPhase: "REJECTED", processedAt: new Date(), error: text(error.message) || "Offline replay failed." } }
        );
        throw error;
    } finally {
        await session.endSession();
    }
}

export async function processPendingOfflineEvents(tenantId, deviceId, options = {}) {
    const events = await getPendingOfflineEvents(tenantId, deviceId, options.limit || 100);
    const results = [];
    for (const event of events) {
        try {
            results.push(await replayOfflineEvent(event, options));
        } catch (error) {
            results.push({ action: "REJECTED", eventId: event.eventId, error: error.message, statusCode: error.statusCode || 500 });
        }
    }
    return { tenantId, deviceId, processed: results.length, results };
}
