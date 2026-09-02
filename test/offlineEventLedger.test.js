import test from "node:test";
import assert from "node:assert/strict";
import { validateOfflineEvent, EVENT_TYPES } from "../server/services/offlineEventLedger.js";

test("offline event requires tenant, device, supported type and payload", () => {
    const result = validateOfflineEvent({ eventId: "e1", tenantId: "t1", deviceId: "d1", eventType: "SALE", occurredAt: new Date().toISOString(), payload: { saleId: "s1" } });
    assert.equal(result.valid, true);
});

test("offline event rejects missing tenant context", () => {
    const result = validateOfflineEvent({ eventId: "e1", deviceId: "d1", eventType: "SALE", occurredAt: new Date().toISOString(), payload: {} });
    assert.equal(result.valid, false);
    assert.match(result.errors.join(" "), /tenantId/);
});

test("offline event rejects unsupported event types", () => {
    const result = validateOfflineEvent({ eventId: "e1", tenantId: "t1", deviceId: "d1", eventType: "UNKNOWN", occurredAt: new Date().toISOString(), payload: {} });
    assert.equal(result.valid, false);
    assert.equal(EVENT_TYPES.includes("UNKNOWN"), false);
});

test("offline event rejects malformed payload and timestamp", () => {
    const result = validateOfflineEvent({ eventId: "e1", tenantId: "t1", deviceId: "d1", eventType: "SALE", occurredAt: "not-a-date", payload: [] });
    assert.equal(result.valid, false);
    assert.equal(result.errors.length, 2);
});
