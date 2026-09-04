import { getCollection } from "./index.js";
import { COLLECTIONS } from "../../shared/schemas/index.js";
import { fromMinorUnits, toMinorUnits, assertBalancedLines, postJournal } from "./ledgerService.js";
import { assertPeriodOpen } from "./accountingPolicyService.js";

function fail(message, statusCode = 400) { const error = new Error(message); error.statusCode = statusCode; throw error; }
function text(value) { return String(value ?? "").trim(); }

export const ACCOUNT_TYPES = Object.freeze(["ASSET", "LIABILITY", "EQUITY", "REVENUE", "EXPENSE"]);

export const DEFAULT_CHART_OF_ACCOUNTS = Object.freeze([
    ["1000", "Cash", "ASSET"], ["1010", "Bank", "ASSET"], ["1020", "Mobile Money", "ASSET"], ["1100", "Accounts Receivable", "ASSET"], ["1200", "Inventory", "ASSET"],
    ["2000", "Accounts Payable", "LIABILITY"], ["2100", "Tax Payable", "LIABILITY"], ["2200", "Insurance Claims Payable", "LIABILITY"],
    ["3000", "Owner Equity", "EQUITY"], ["3100", "Retained Earnings", "EQUITY"],
    ["4000", "Medicine Sales", "REVENUE"], ["4100", "Other Sales", "REVENUE"], ["4200", "Insurance Revenue", "REVENUE"],
    ["5000", "Cost of Goods Sold", "EXPENSE"], ["5100", "Operating Expenses", "EXPENSE"], ["5200", "Damaged/Expired Stock", "EXPENSE"], ["5300", "Bank and Payment Fees", "EXPENSE"]
].map(([code, name, type]) => Object.freeze({ code, name, type })));

function normalizeAccount(input = {}) {
    const code = text(input.code);
    const name = text(input.name);
    const type = text(input.type).toUpperCase();
    if (!code || !name) fail("Account code and name are required.");
    if (!ACCOUNT_TYPES.includes(type)) fail("Account type must be ASSET, LIABILITY, EQUITY, REVENUE or EXPENSE.");
    return { code, name, type, active: input.active !== false };
}

export async function ensureChartOfAccounts(tenantId) {
    const id = text(tenantId);
    if (!id) fail("Tenant context is required.", 403);
    const collection = getCollection(COLLECTIONS.CHART_OF_ACCOUNTS);
    await collection.createIndex({ tenantId: 1, code: 1 }, { unique: true, name: "coa_tenant_code_unique" });
    const now = new Date();
    const operations = DEFAULT_CHART_OF_ACCOUNTS.map((account) => ({ updateOne: { filter: { tenantId: id, code: account.code }, update: { $setOnInsert: { tenantId: id, ...account, createdAt: now }, $set: { updatedAt: now } }, upsert: true } }));
    if (operations.length) await collection.bulkWrite(operations, { ordered: true });
    return collection.find({ tenantId: id }).sort({ code: 1 }).toArray();
}

export async function createAccount(tenantId, input) {
    const id = text(tenantId);
    if (!id) fail("Tenant context is required.", 403);
    const account = normalizeAccount(input);
    const now = new Date();
    const collection = getCollection(COLLECTIONS.CHART_OF_ACCOUNTS);
    await collection.createIndex({ tenantId: 1, code: 1 }, { unique: true, name: "coa_tenant_code_unique" });
    try {
        const result = await collection.insertOne({ tenantId: id, ...account, createdAt: now, updatedAt: now });
        return { ...account, tenantId: id, _id: result.insertedId };
    } catch (error) {
        if (error?.code === 11000) fail("Account code already exists for this tenant.", 409);
        throw error;
    }
}

export async function listAccounts(tenantId, { activeOnly = false } = {}) {
    const id = text(tenantId);
    if (!id) fail("Tenant context is required.", 403);
    const filter = { tenantId: id };
    if (activeOnly) filter.active = true;
    return getCollection(COLLECTIONS.CHART_OF_ACCOUNTS).find(filter).sort({ code: 1 }).toArray();
}

function parseDate(value, message) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) fail(message);
    return date;
}

async function ledgerRows({ tenantId, branchId, currency, from, to }) {
    const id = text(tenantId);
    if (!id) fail("Tenant context is required.", 403);
    const normalizedCurrency = text(currency || "TZS").toUpperCase();
    const filter = { tenantId: id, currency: normalizedCurrency };
    if (text(branchId)) filter.branchId = text(branchId);
    if (from || to) {
        filter.createdAt = {};
        if (from) filter.createdAt.$gte = parseDate(from, "Invalid accounting start date.");
        if (to) filter.createdAt.$lt = parseDate(to, "Invalid accounting end date.");
    }
    return getCollection(COLLECTIONS.LEDGER_JOURNALS).find(filter, { projection: { lines: 1, createdAt: 1 } }).toArray();
}

export async function trialBalanceDetailed(options = {}) {
    const journals = await ledgerRows(options);
    const balances = new Map();
    for (const journal of journals) for (const line of journal.lines || []) {
        const account = text(line.account);
        if (!account) continue;
        const value = BigInt(line.amountMinor || 0);
        const row = balances.get(account) || { debitMinor: 0n, creditMinor: 0n };
        if (String(line.side).toUpperCase() === "DEBIT") row.debitMinor += value;
        if (String(line.side).toUpperCase() === "CREDIT") row.creditMinor += value;
        balances.set(account, row);
    }
    const rows = [...balances.entries()].map(([account, value]) => ({ account, debit: fromMinorUnits(value.debitMinor), credit: fromMinorUnits(value.creditMinor), net: fromMinorUnits(value.debitMinor - value.creditMinor) })).sort((a, b) => a.account.localeCompare(b.account));
    const debitMinor = rows.reduce((sum, row) => sum + toMinorUnits(row.debit), 0n);
    const creditMinor = rows.reduce((sum, row) => sum + toMinorUnits(row.credit), 0n);
    return { rows, totals: { debit: fromMinorUnits(debitMinor), credit: fromMinorUnits(creditMinor), balanced: debitMinor === creditMinor } };
}

async function classify(tenantId, rows) {
    const accounts = await listAccounts(tenantId);
    const byCode = new Map(accounts.map((account) => [account.code, account]));
    return rows.map((row) => {
        const account = byCode.get(row.account);
        return { ...row, type: account?.type || "UNMAPPED", name: account?.name || row.account };
    });
}

export async function incomeStatement({ tenantId, branchId, currency = "TZS", from, to } = {}) {
    const id = text(tenantId);
    if (!id) fail("Tenant context is required.", 403);
    const period = { startsAt: from, endsAt: to, at: from || to || new Date() };
    if (from && to) { parseDate(from, "Invalid accounting start date."); parseDate(to, "Invalid accounting end date."); }
    const trial = await trialBalanceDetailed({ tenantId: id, branchId, currency, from, to });
    const rows = await classify(id, trial.rows);
    const revenue = rows.filter((r) => r.type === "REVENUE");
    const expenses = rows.filter((r) => r.type === "EXPENSE");
    const sum = (items) => items.reduce((total, row) => total + toMinorUnits(row.credit || 0) - toMinorUnits(row.debit || 0), 0n);
    const revenueMinor = sum(revenue);
    const expenseMinor = expenses.reduce((total, row) => total + toMinorUnits(row.debit || 0) - toMinorUnits(row.credit || 0), 0n);
    return { currency: text(currency || "TZS").toUpperCase(), from: from || null, to: to || null, revenue, expenses, totals: { revenue: fromMinorUnits(revenueMinor), expenses: fromMinorUnits(expenseMinor), netIncome: fromMinorUnits(revenueMinor - expenseMinor) }, periodValidated: Boolean(period) };
}

export async function balanceSheet({ tenantId, branchId, currency = "TZS", to } = {}) {
    const id = text(tenantId);
    if (!id) fail("Tenant context is required.", 403);
    const trial = await trialBalanceDetailed({ tenantId: id, branchId, currency, to: to ? parseDate(to, "Invalid balance-sheet date.") : undefined });
    const rows = await classify(id, trial.rows);
    const grouped = Object.fromEntries(ACCOUNT_TYPES.map((type) => [type, []]));
    for (const row of rows) if (grouped[row.type]) grouped[row.type].push(row);
    const total = (type, side) => grouped[type].reduce((sum, row) => sum + toMinorUnits(side === "debit" ? row.debit : row.credit), 0n);
    const assets = total("ASSET", "debit") - total("ASSET", "credit");
    const liabilities = total("LIABILITY", "credit") - total("LIABILITY", "debit");
    const equity = total("EQUITY", "credit") - total("EQUITY", "debit");
    const revenue = total("REVENUE", "credit") - total("REVENUE", "debit");
    const expenses = total("EXPENSE", "debit") - total("EXPENSE", "credit");
    const retained = equity + revenue - expenses;
    return { currency: text(currency || "TZS").toUpperCase(), asOf: to || null, assets: grouped.ASSET, liabilities: grouped.LIABILITY, equity: grouped.EQUITY, retainedEarnings: fromMinorUnits(retained), totals: { assets: fromMinorUnits(assets), liabilities: fromMinorUnits(liabilities), equityAndRetainedEarnings: fromMinorUnits(retained + liabilities), balanced: assets === liabilities + retained } };
}

export async function reconcileLedger({ tenantId, branchId, currency = "TZS", from, to } = {}) {
    const trial = await trialBalanceDetailed({ tenantId, branchId, currency, from, to });
    const journals = await ledgerRows({ tenantId, branchId, currency, from, to });
    const journalBalance = journals.every((journal) => {
        try { assertBalancedLines(journal.lines || []); return true; } catch { return false; }
    });
    return { journalCount: journals.length, trialBalance: trial.totals, everyJournalBalanced: journalBalance, reconciled: journalBalance && trial.totals.balanced };
}

export async function postBusinessJournal(input = {}) {
    const { tenantId, occurredAt, period, ...journal } = input;
    assertPeriodOpen({ ...(period || {}), at: occurredAt || new Date() });
    return postJournal({ ...journal, tenantId });
}

export async function closeAccountingPeriod(tenantId, { startsAt, endsAt, closedBy, note } = {}) {
    const id = text(tenantId);
    if (!id) fail("Tenant context is required.", 403);
    const start = parseDate(startsAt, "Invalid accounting period start.");
    const end = parseDate(endsAt, "Invalid accounting period end.");
    if (end <= start) fail("Accounting period end must be after start.");
    const reconciliation = await reconcileLedger({ tenantId: id, from: start, to: end });
    if (!reconciliation.reconciled) fail("Accounting period cannot close until the ledger reconciles.", 409);
    const collection = getCollection(COLLECTIONS.ACCOUNTING_PERIODS);
    await collection.createIndex({ tenantId: 1, startsAt: 1, endsAt: 1 }, { unique: true, name: "accounting_period_unique" });
    const now = new Date();
    const period = { tenantId: id, startsAt: start, endsAt: end, closed: true, closedAt: now, closedBy: text(closedBy) || null, note: text(note) || null, reconciliation, createdAt: now, updatedAt: now };
    try { const result = await collection.insertOne(period); return { ...period, _id: result.insertedId }; }
    catch (error) { if (error?.code === 11000) fail("Accounting period already exists.", 409); throw error; }
}

export async function listAccountingPeriods(tenantId) {
    const id = text(tenantId);
    if (!id) fail("Tenant context is required.", 403);
    return getCollection(COLLECTIONS.ACCOUNTING_PERIODS).find({ tenantId: id }).sort({ startsAt: -1 }).toArray();
}
