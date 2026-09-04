import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";

const file = path.resolve(process.cwd(), "client", "pos-master.html");

test("master POS retains cashier and post-sale workspaces", async () => {
    const html = await fs.readFile(file, "utf8");
    for (const marker of [
        "Fast Sale Entry",
        "Transaction Workspace",
        "Split Tender",
        "NHIF / Insurance",
        "Post-Sale",
        "Expense Ledger",
        "Recent Transaction",
        "Complete Sale",
        "api/transactions"
    ]) {
        assert.match(html, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), `missing master POS marker: ${marker}`);
    }
});

test("Smart Invoice remains a separate application workspace until embedded safely", async () => {
    const html = await fs.readFile(file, "utf8");
    assert.doesNotMatch(html, /invoice-import-embedded\.js/);
    assert.doesNotMatch(html, /data-smart-invoice-import/);
});
