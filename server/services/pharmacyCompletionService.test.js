import test from "node:test";
import assert from "node:assert/strict";
import { validateEligibility, validatePreauthorization, validateClaimBatch, idempotencyFingerprint, createDelegation } from "./pharmacyCompletionService.js";

test("insurance eligibility requires tenant, scheme and member", () => {
    assert.throws(() => validateEligibility({ scheme: "NHIF", memberId: "M1" }), /Tenant context is required/);
    assert.equal(validateEligibility({ tenantId: "t1", scheme: "NHIF", memberId: "M1" }).status, "PENDING");
});

test("preauthorization rejects non-positive amount", () => {
    assert.throws(() => validatePreauthorization({ tenantId: "t1", scheme: "NHIF", memberId: "M1", requestedAmount: 0 }), /greater than zero/);
});

test("claim batch normalizes and validates claims", () => {
    const batch = validateClaimBatch({ tenantId: "t1", scheme: "NHIF", claims: [{ claimId: "C1", amount: 1000 }] });
    assert.equal(batch.claims.length, 1);
    assert.equal(batch.status, "READY");
});

test("delegation requires a bounded time window and scope", () => {
    assert.rejects(createDelegation({ tenantId: "t1", delegatorId: "a", delegateeId: "b", scope: ["REFUND"], startsAt: "2026-01-02T00:00:00Z", expiresAt: "2026-01-01T00:00:00Z" }), /expiry must be after/);
});

test("idempotency fingerprint is deterministic", () => {
    assert.equal(idempotencyFingerprint({ a: 1 }), idempotencyFingerprint({ a: 1 }));
});
