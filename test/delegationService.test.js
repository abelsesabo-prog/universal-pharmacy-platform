import test from "node:test";
import assert from "node:assert/strict";
import { validateDelegation } from "../server/services/delegationService.js";

test("delegation requires a bounded sensitive scope", () => {
    const delegation = validateDelegation({ tenantId: "t1", delegatorId: "u1", delegateeId: "u2", scope: "REFUND", startsAt: "2026-01-01T00:00:00Z", expiresAt: "2026-01-02T00:00:00Z", valueCap: 100000 });
    assert.equal(delegation.scope, "REFUND");
    assert.equal(delegation.status, "ACTIVE");
    assert.equal(delegation.reviewRequired, true);
});

test("delegation rejects unbounded or unknown scopes", () => {
    assert.throws(() => validateDelegation({ tenantId: "t1", delegatorId: "u1", delegateeId: "u2", scope: "EVERYTHING", startsAt: "2026-01-01", expiresAt: "2026-01-02" }), /Unsupported delegation scope/);
});

test("delegation requires expiry after start", () => {
    assert.throws(() => validateDelegation({ tenantId: "t1", delegatorId: "u1", delegateeId: "u2", scope: "REFUND", startsAt: "2026-01-02", expiresAt: "2026-01-01" }), /expiry must be after/);
});
