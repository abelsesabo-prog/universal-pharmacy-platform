import test from "node:test";
import assert from "node:assert/strict";
import { assertBalancedLines, buildJournal, fromMinorUnits, toMinorUnits } from "./ledgerService.js";

test("exact money conversion uses minor units without floating point", () => {
    assert.equal(toMinorUnits("3000.50"), 300050n);
    assert.equal(toMinorUnits("10"), 1000n);
    assert.equal(fromMinorUnits(300050n), "3000.50");
    assert.throws(() => toMinorUnits("10.999"), /exact decimal/);
});

test("double-entry journals must balance", () => {
    const result = assertBalancedLines([
        { account: "Cash", side: "DEBIT", amount: "3000.00" },
        { account: "Sales", side: "CREDIT", amount: "3000.00" }
    ]);
    assert.equal(result.debits, 300000n);
    assert.equal(result.credits, 300000n);
    assert.throws(() => assertBalancedLines([{ account: "Cash", side: "DEBIT", amount: "1.00" }]), /not balanced/);
});

test("journal contract requires idempotency and produces immutable exact amounts", () => {
    const journal = buildJournal({
        tenantId: "t1",
        branchId: "b1",
        currency: "tzs",
        referenceType: "SALE",
        referenceId: "s1",
        idempotencyKey: "sale:s1",
        lines: [
            { account: "Cash", side: "DEBIT", amount: "3000.00" },
            { account: "Sales", side: "CREDIT", amount: "3000.00" }
        ]
    });
    assert.equal(journal.currency, "TZS");
    assert.equal(journal.immutable, true);
    assert.equal(journal.lines[0].amountMinor, "300000");
    assert.equal(journal.totalDebitMinor, "300000");
    assert.throws(() => buildJournal({ tenantId: "t1", lines: [] }), /Idempotency key/);
});
