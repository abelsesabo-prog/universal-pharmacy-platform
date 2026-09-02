import test from "node:test";
import assert from "node:assert/strict";
import { validateReplayEvent } from "../server/services/offlineEventProcessor.js";

test("offline replay validator accepts a structurally valid sale event", () => {
    const result = validateReplayEvent({
        eventId: "evt-1",
        tenantId: "tenant-a",
        eventType: "SALE",
        payload: { productId: "507f1f77bcf86cd799439011", quantity: 2, baseQuantity: 2 }
    });
    assert.equal(result.valid, true);
    assert.deepEqual(result.errors, []);
});

test("offline replay validator rejects an array payload", () => {
    const result = validateReplayEvent({
        eventId: "evt-2",
        tenantId: "tenant-a",
        eventType: "SALE",
        payload: []
    });
    assert.equal(result.valid, false);
    assert.ok(result.errors.includes("payload must be an object."));
});
