import test from "node:test";
import assert from "node:assert/strict";
import { fingerprintOfflineEvent, MAX_SYNC_EVENTS, validateSyncEnvelope } from "../server/services/offlineSyncService.js";

test("offline sync requires a tenant, device and non-empty event batch", () => {
    const result = validateSyncEnvelope({ tenantId: "t1", deviceId: "d1", events: [] });
    assert.equal(result.valid, false);
    assert.match(result.errors.join(" "), /events must not be empty/);
});

test("offline sync rejects tenant or device spoofing inside an event", () => {
    const result = validateSyncEnvelope({
        tenantId: "t1",
        deviceId: "d1",
        events: [{ eventId: "e1", tenantId: "t2", deviceId: "d9", eventType: "SALE", occurredAt: new Date().toISOString(), payload: {} }]
    });
    assert.equal(result.valid, false);
    assert.match(result.errors.join(" "), /tenant mismatch/);
    assert.match(result.errors.join(" "), /device mismatch/);
});

test("offline sync rejects duplicate IDs and non-increasing sequences", () => {
    const result = validateSyncEnvelope({
        tenantId: "t1",
        deviceId: "d1",
        events: [
            { eventId: "e1", sequence: 2 },
            { eventId: "e1", sequence: 2 },
            { eventId: "e2", sequence: 1 }
        ]
    });
    assert.equal(result.valid, false);
    assert.match(result.errors.join(" "), /duplicate eventId/);
    assert.match(result.errors.join(" "), /strictly increasing/);
});

test("offline sync enforces the batch safety boundary", () => {
    const events = Array.from({ length: MAX_SYNC_EVENTS + 1 }, (_, index) => ({ eventId: `e${index + 1}` }));
    const result = validateSyncEnvelope({ tenantId: "t1", deviceId: "d1", events });
    assert.equal(result.valid, false);
    assert.match(result.errors.join(" "), new RegExp(`${MAX_SYNC_EVENTS}`));
});

test("offline event fingerprint is stable across object key order", () => {
    const base = { eventId: "e1", tenantId: "t1", deviceId: "d1", eventType: "SALE", occurredAt: "2026-09-02T10:00:00.000Z", payload: { quantity: 2, productId: "p1" } };
    const reordered = { ...base, payload: { productId: "p1", quantity: 2 } };
    assert.equal(fingerprintOfflineEvent(base), fingerprintOfflineEvent(reordered));
});

test("offline event fingerprint changes when business payload changes", () => {
    const base = { eventId: "e1", tenantId: "t1", deviceId: "d1", eventType: "SALE", occurredAt: "2026-09-02T10:00:00.000Z", payload: { quantity: 2, productId: "p1" } };
    const changed = { ...base, payload: { quantity: 3, productId: "p1" } };
    assert.notEqual(fingerprintOfflineEvent(base), fingerprintOfflineEvent(changed));
});
