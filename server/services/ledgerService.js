import { getCollection } from "./index.js";
import { COLLECTIONS } from "../../shared/schemas/index.js";

function fail(message, statusCode = 400) {
    const error = new Error(message);
    error.statusCode = statusCode;
    throw error;
}

const DECIMAL_SCALE = 100;
const ISO_CURRENCY = /^[A-Z]{3}$/;
let ledgerIndexPromise;

function ledgerCollection() {
    const collection = getCollection(COLLECTIONS.LEDGER_JOURNALS);
    ledgerIndexPromise ||= collection.createIndex({ tenantId: 1, idempotencyKey: 1 }, { unique: true, name: "ledger_tenant_idempotency_unique" });
    return { collection, ready: ledgerIndexPromise };
}

export function toMinorUnits(value) {
    if (typeof value === "bigint") return value;
    const raw = String(value ?? "").trim();
    if (!/^-?\d+(\.\d{1,2})?$/.test(raw)) fail("Money must be an exact decimal with at most two fractional digits.");
    const negative = raw.startsWith("-");
    const clean = negative ? raw.slice(1) : raw;
    const [whole, fraction = ""] = clean.split(".");
    const minor = BigInt(whole) * 100n + BigInt((fraction + "00").slice(0, 2));
    return negative ? -minor : minor;
}

export function fromMinorUnits(value) {
    const minor = BigInt(value);
    const negative = minor < 0n;
    const abs = negative ? -minor : minor;
    const whole = abs / 100n;
    const fraction = String(abs % 100n).padStart(2, "0");
    return `${negative ? "-" : ""}${whole}.${fraction}`;
}

export function assertBalancedLines(lines = []) {
    if (!Array.isArray(lines) || !lines.length) fail("At least one journal line is required.");
    let debits = 0n;
    let credits = 0n;
    for (const line of lines) {
        const amount = toMinorUnits(line.amount ?? line.amountMinor);
        if (amount <= 0n) fail("Journal line amount must be positive.");
        const side = String(line.side || "").toUpperCase();
        if (side === "DEBIT") debits += amount;
        else if (side === "CREDIT") credits += amount;
        else fail("Journal line side must be DEBIT or CREDIT.");
        if (!String(line.account || "").trim()) fail("Journal account is required.");
    }
    if (debits !== credits) fail(`Journal is not balanced: debit ${fromMinorUnits(debits)} != credit ${fromMinorUnits(credits)}.`);
    return { debits, credits };
}

export function buildJournal({ tenantId, branchId, currency = "TZS", referenceType, referenceId, idempotencyKey, description, lines } = {}) {
    if (!tenantId) fail("Tenant context is required.", 403);
    const normalizedCurrency = String(currency || "").trim().toUpperCase();
    if (!ISO_CURRENCY.test(normalizedCurrency)) fail("Currency must be a three-letter ISO-style code.");
    if (!String(idempotencyKey || "").trim()) fail("Idempotency key is required for journal posting.");
    const normalizedLines = Array.isArray(lines) ? lines : [];
    const { debits, credits } = assertBalancedLines(normalizedLines);
    return Object.freeze({
        tenantId: String(tenantId),
        branchId: branchId ? String(branchId) : null,
        currency: normalizedCurrency,
        referenceType: referenceType ? String(referenceType).trim().toUpperCase() : null,
        referenceId: referenceId ? String(referenceId).trim() : null,
        idempotencyKey: String(idempotencyKey).trim(),
        description: description ? String(description).trim() : null,
        lines: normalizedLines.map((line) => ({
            account: String(line.account).trim(),
            side: String(line.side).toUpperCase(),
            amountMinor: toMinorUnits(line.amount ?? line.amountMinor).toString(),
            memo: line.memo ? String(line.memo).trim() : null
        })),
        totalDebitMinor: debits.toString(),
        totalCreditMinor: credits.toString(),
        immutable: true,
        createdAt: new Date()
    });
}

export async function postJournal(input = {}) {
    const journal = buildJournal(input);
    const { collection, ready } = ledgerCollection();
    await ready;
    const existing = await collection.findOne({ tenantId: journal.tenantId, idempotencyKey: journal.idempotencyKey });
    if (existing) return { journal: existing, duplicate: true };

    try {
        const result = await collection.insertOne(journal);
        return { journal: { ...journal, _id: result.insertedId }, duplicate: false };
    } catch (error) {
        if (error?.code === 11000) {
            const raced = await collection.findOne({ tenantId: journal.tenantId, idempotencyKey: journal.idempotencyKey });
            if (raced) return { journal: raced, duplicate: true };
        }
        throw error;
    }
}

export async function listJournals({ tenantId, branchId, from, to, limit = 100, skip = 0 } = {}) {
    if (!String(tenantId || "").trim()) fail("Tenant context is required.", 403);
    const filter = { tenantId: String(tenantId).trim() };
    if (String(branchId || "").trim()) filter.branchId = String(branchId).trim();
    if (from || to) {
        filter.createdAt = {};
        if (from) filter.createdAt.$gte = new Date(from);
        if (to) filter.createdAt.$lt = new Date(to);
        if ((filter.createdAt.$gte && Number.isNaN(filter.createdAt.$gte.getTime())) || (filter.createdAt.$lt && Number.isNaN(filter.createdAt.$lt.getTime()))) fail("Invalid journal date range.");
    }
    const safeLimit = Math.min(Math.max(Number(limit) || 100, 1), 200);
    const safeSkip = Math.max(Number(skip) || 0, 0);
    const { collection, ready } = ledgerCollection();
    await ready;
    return collection.find(filter).sort({ createdAt: -1 }).skip(safeSkip).limit(safeLimit).toArray();
}

export async function trialBalance({ tenantId, branchId, currency = "TZS" } = {}) {
    if (!String(tenantId || "").trim()) fail("Tenant context is required.", 403);
    const normalizedCurrency = String(currency || "").trim().toUpperCase();
    if (!ISO_CURRENCY.test(normalizedCurrency)) fail("Currency must be a three-letter ISO-style code.");
    const filter = { tenantId: String(tenantId).trim(), currency: normalizedCurrency };
    if (String(branchId || "").trim()) filter.branchId = String(branchId).trim();
    const { collection, ready } = ledgerCollection();
    await ready;
    const journals = await collection.find(filter, { projection: { lines: 1 } }).toArray();
    const accounts = {};
    for (const journal of journals) {
        for (const line of journal.lines || []) {
            const account = String(line.account || "");
            const minor = BigInt(line.amountMinor || 0);
            if (!accounts[account]) accounts[account] = { debitMinor: 0n, creditMinor: 0n };
            if (line.side === "DEBIT") accounts[account].debitMinor += minor;
            if (line.side === "CREDIT") accounts[account].creditMinor += minor;
        }
    }
    return Object.entries(accounts).map(([account, value]) => ({
        account,
        debit: fromMinorUnits(value.debitMinor),
        credit: fromMinorUnits(value.creditMinor),
        net: fromMinorUnits(value.debitMinor - value.creditMinor)
    })).sort((a, b) => a.account.localeCompare(b.account));
}

export { DECIMAL_SCALE };
