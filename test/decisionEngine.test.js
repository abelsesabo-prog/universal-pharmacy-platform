import test from "node:test";
import assert from "node:assert/strict";
import { decideProductResolution } from "../server/reasoning/decisionEngine.js";

test("reasoning engine explains product reuse from canonical identity evidence", () => {
    const result = decideProductResolution({
        tenantId: "tenant-a",
        identityKey: "panadol|paracetamol|tablet|500mg",
        existingProduct: { _id: "p1" }
    });
    assert.equal(result.action, "REUSE");
    assert.equal(result.reason, "CANONICAL_IDENTITY_MATCH");
    assert.equal(result.productId, "p1");
});

test("reasoning engine explains creation when no canonical product matches", () => {
    const result = decideProductResolution({
        tenantId: "tenant-a",
        identityKey: "medipar|paracetamol|tablet|500mg",
        existingProduct: null
    });
    assert.equal(result.action, "CREATE");
    assert.equal(result.reason, "NO_CANONICAL_IDENTITY_MATCH");
});

test("reasoning engine refuses decisions without tenant context", () => {
    const result = decideProductResolution({ identityKey: "x", existingProduct: null });
    assert.equal(result.action, "REJECT");
    assert.equal(result.reason, "TENANT_CONTEXT_REQUIRED");
});
