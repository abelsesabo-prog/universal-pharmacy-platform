import { createHash } from "node:crypto";
import { appendOfflineEvent } from "./offlineEventLedger.js";
import { replayOfflineEvent } from "./offlineEventProcessor.js";

export const MAX_SYNC_EVENTS = 100;

function text(value) { return String(value ?? "").trim(); }

function stableValue(value) {
    if (Array.isArray(value)) return value.map(stableValue);
    if (value && typeof value === "object") {
        return Object.keys(value).sort().reduce((out, key) => {
            out[key] = stableValue(value[key]);
            return out;
        }, {});
    }
    return value;
}

export function fingerprintOfflineEvent(event = {}) {
    const canonical = JSON.stringify(stableValue({
        eventId: text(event.eventId),
        tenantId: text(event.tenantId),
        deviceId: text(event.deviceId),
        eventType: text(event.eventType),
        occurredAt: new Date(event.occurredAt).toISOString(),
        branchId: text(event.branchId) || null,
        userId: text(event.userId) || null,
        sequence: Number.isInteger(event.sequence) ? event.sequence : null,
        payload: event.payload
    }));
    return createHash("sha256").update(canonical).digest("hex");
}

export function validateSyncEnvelope(input = {}) {
    const errors = [];
    const tenantId = text(input.tenantId);
    const deviceId = text(input.deviceId);
    const events = input.events;

    if (!tenantId) errors.push("tenantId is required.");
    if (!deviceId) errors.push("deviceId is required.");
    if (!Array.isArray(events)) errors.push("events must be an array.");
    else {
        if (events.length === 0) errors.push("events must not be empty.");
        if (events.length > MAX_SYNC_EVENTS) errors.push(`events cannot exceed ${MAX_SYNC_EVENTS} items.`);
        const ids = new Set();
        let previousSequence = null;
        for (const event of events) {
            if (!event || typeof event !== "object" || Array.isArray(event)) {
                errors.push("every event must be an object.");
                continue;
            }
            if (text(event.tenantId) && text(event.tenantId) !== tenantId) errors.push(`event ${text(event.eventId) || "unknown"} has a tenant mismatch.`);
            if (text(event.deviceId) && text(event.deviceId) !== deviceId) errors.push(`event ${text(event.eventId) || "unknown"} has a device mismatch.`);
            const eventId = text(event.eventId);
            if (!eventId) errors.push("every event requires eventId.");
            else if (ids.has(eventId)) errors.push(`duplicate eventId '${eventId}' in sync batch.`);
            else ids.add(eventId);
            if (event.sequence !== undefined) {
                const sequence = Number(event.sequence);
                if (!Number.isInteger(sequence) || sequence < 1) errors.push(`event ${eventId || "unknown"} sequence must be a positive integer.`);
                else if (previousSequence !== null && sequence <= previousSequence) errors.push("event sequences must be strictly increasing within a sync batch.");
                else previousSequence = sequence;
            }
        }
    }
    return { valid: errors.length === 0, errors };
}

export async function syncOfflineEvents(input = {}, options = {}) {
    const validation = validateSyncEnvelope(input);
    if (!validation.valid) {
        const error = new Error(validation.errors.join(" "));
        error.statusCode = 400;
        throw error;
    }

    const tenantId = text(input.tenantId);
    const deviceId = text(input.deviceId);
    const acknowledgements = [];

    for (const rawEvent of input.events) {
        const event = {
            ...rawEvent,
            tenantId,
            deviceId,
            userId: text(rawEvent.userId) || options.userId || null,
            fingerprint: fingerprintOfflineEvent({ ...rawEvent, tenantId, deviceId, userId: text(rawEvent.userId) || options.userId || null }),
            status: "PENDING"
        };

        try {
            const accepted = await appendOfflineEvent(event);
            if (accepted.duplicate) {
                const existingFingerprint = accepted.event.fingerprint || fingerprintOfflineEvent(accepted.event);
                if (existingFingerprint !== event.fingerprint) {
                    acknowledgements.push({ eventId: event.eventId, status: "CONFLICT", reason: "eventId already exists with different event content." });
                    continue;
                }
                acknowledgements.push({ eventId: event.eventId, status: accepted.event.status, duplicate: true });
                continue;
            }
            try {
                const replay = await replayOfflineEvent(accepted.event, { processor: options.processor || "offline-sync" });
                acknowledgements.push({ eventId: event.eventId, status: "APPLIED", duplicate: false, replay });
            } catch (error) {
                acknowledgements.push({ eventId: event.eventId, status: "REJECTED", error: error.message, statusCode: error.statusCode || 500 });
            }
        } catch (error) {
            acknowledgements.push({ eventId: event.eventId, status: "REJECTED", error: error.message, statusCode: error.statusCode || 500 });
        }
    }

    const applied = acknowledgements.filter(item => item.status === "APPLIED").length;
    const duplicates = acknowledgements.filter(item => item.duplicate).length;
    const conflicts = acknowledgements.filter(item => item.status === "CONFLICT").length;
    const rejected = acknowledgements.filter(item => item.status === "REJECTED").length;
    return { tenantId, deviceId, received: input.events.length, applied, duplicates, conflicts, rejected, acknowledgements };
}
