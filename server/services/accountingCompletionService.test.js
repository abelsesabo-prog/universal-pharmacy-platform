import assert from "node:assert/strict";
import test from "node:test";
import { ACCOUNT_TYPES, DEFAULT_CHART_OF_ACCOUNTS } from "./accountingCompletionService.js";
import { assertBalancedLines, toMinorUnits } from "./ledgerService.js";

test("accounting completion exposes the canonical five account types", () => {
    assert.deepEqual(ACCOUNT_TYPES, ["ASSET", "LIABILITY", "EQUITY", "REVENUE", "EXPENSE"]);
});

test("default chart covers pharmacy cash, inventory, payables, equity, revenue and expenses", () => {
    const codes = new Set(DEFAULT_CHART_OF_ACCOUNTS.map((account) => account.code));
    for (const code of ["1000", "1200", "2000", "3000", "4000", "5000", "5100", "5200"]) assert.equal(codes.has(code), true, `missing account ${code}`);
});

test("statement accounting remains exact minor-unit double entry", () => {
    const lines = [
        { account: "1000", side: "DEBIT", amount: "100.10" },
        { account: "4000", side: "CREDIT", amount: "100.10" }
    ];
    const totals = assertBalancedLines(lines);
    assert.equal(totals.debits, toMinorUnits("100.10"));
    assert.equal(totals.credits, toMinorUnits("100.10"));
});
