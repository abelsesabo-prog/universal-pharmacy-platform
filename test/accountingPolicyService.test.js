import test from "node:test";
import assert from "node:assert/strict";
import { validateAccountingPolicy, calculateTax, assertPeriodOpen } from "../server/services/accountingPolicyService.js";

test("accounting policy accepts TZS with no tax", () => {
    const policy = validateAccountingPolicy({ currency: "TZS", taxType: "NONE", taxRate: 0 });
    assert.equal(policy.currency, "TZS");
    assert.equal(policy.taxRate, 0);
});

test("accounting policy rejects inconsistent tax configuration", () => {
    assert.throws(() => validateAccountingPolicy({ currency: "TZS", taxType: "NONE", taxRate: 18 }), /Tax rate must be zero/);
});

test("tax calculation uses exact minor-unit arithmetic", () => {
    const result = calculateTax("100.00", { currency: "TZS", taxType: "VAT", taxRate: 18 });
    assert.equal(result.baseMinor, 10000n);
    assert.equal(result.taxMinor, 1800n);
    assert.equal(result.totalMinor, 11800n);
});

test("closed accounting periods reject posting", () => {
    assert.throws(() => assertPeriodOpen({ closed: true }), /period is closed/i);
});

test("accounting period boundaries are enforced", () => {
    assert.throws(() => assertPeriodOpen({ startsAt: "2026-01-01", endsAt: "2026-02-01", at: "2026-02-01" }), /outside the accounting period/);
});
