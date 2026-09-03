import { getCollection } from "./index.js";
import { COLLECTIONS } from "../../shared/schemas/index.js";

function fail(message, statusCode = 400) {
    const error = new Error(message);
    error.statusCode = statusCode;
    throw error;
}

const PAYMENT_METHODS = new Set(["CASH", "MPESA", "MIXX", "AIRTEL_MONEY", "HALOPESA", "AZAM_PESA", "CARD", "BANK", "CREDIT", "OTHER"]);

function text(value) { return String(value ?? "").trim(); }
function amount(value) {
    const n = Number(value);
    if (!Number.isFinite(n) || n <= 0) fail("Amount must be greater than zero.");
    return n;
}
function method(value) {
    const normalized = text(value).toUpperCase();
    if (!PAYMENT_METHODS.has(normalized)) fail(`Unsupported payment method: ${normalized || "empty"}.`);
    return normalized;
}

export function validateFinancialEntry(input = {}) {
    const tenantId = text(input.tenantId);
    if (!tenantId) fail("Tenant context is required.", 403);
    const direction = text(input.direction).toUpperCase();
    if (!["IN", "OUT"].includes(direction)) fail("Financial direction must be IN or OUT.");
    return {
        tenantId,
        branchId: text(input.branchId) || null,
        account: text(input.account),
        direction,
        amount: amount(input.amount),
        paymentMethod: method(input.paymentMethod),
        referenceType: text(input.referenceType).toUpperCase() || null,
        referenceId: text(input.referenceId) || null,
        description: text(input.description) || null,
        occurredAt: input.occurredAt ? new Date(input.occurredAt) : new Date()
    };
}

export async function createFinancialEntry(input) {
    const entry = validateFinancialEntry(input);
    if (!entry.account) fail("Financial account is required.");
    if (Number.isNaN(entry.occurredAt.getTime())) fail("Invalid occurredAt.");
    const result = await getCollection(COLLECTIONS.FINANCIAL_ENTRIES).insertOne({ ...entry, createdAt: new Date() });
    return { ...entry, _id: result.insertedId };
}

export async function listFinancialEntries({ tenantId, branchId, limit = 100, skip = 0 } = {}) {
    if (!text(tenantId)) fail("Tenant context is required.", 403);
    const filter = { tenantId: text(tenantId) };
    if (text(branchId)) filter.branchId = text(branchId);
    const safeLimit = Math.min(Math.max(Number(limit) || 100, 1), 200);
    const safeSkip = Math.max(Number(skip) || 0, 0);
    return getCollection(COLLECTIONS.FINANCIAL_ENTRIES).find(filter).sort({ occurredAt: -1, createdAt: -1 }).skip(safeSkip).limit(safeLimit).toArray();
}

export async function reconcilePaymentMethods({ tenantId, branchId, from, to } = {}) {
    if (!text(tenantId)) fail("Tenant context is required.", 403);
    const filter = { tenantId: text(tenantId), status: "COMPLETED" };
    if (text(branchId)) filter.branchId = text(branchId);
    const range = {};
    if (from) range.$gte = new Date(from);
    if (to) range.$lt = new Date(to);
    if (Object.keys(range).length) filter.createdAt = range;

    const sales = await getCollection(COLLECTIONS.SALES).find(filter, { projection: { payments: 1, total: 1 } }).toArray();
    const expenseFilter = { tenantId: text(tenantId) };
    if (text(branchId)) expenseFilter.branchId = text(branchId);
    if (Object.keys(range).length) expenseFilter.createdAt = range;
    const expenses = await getCollection(COLLECTIONS.EXPENSES).find(expenseFilter).toArray();

    const byMethod = {};
    for (const sale of sales) {
        for (const payment of sale.payments || []) {
            const key = text(payment.method).toUpperCase() || "OTHER";
            byMethod[key] = (byMethod[key] || 0) + Number(payment.amount || 0);
        }
    }
    const expenseByMethod = {};
    for (const expense of expenses) {
        const key = text(expense.paymentMethod || expense.method).toUpperCase() || "OTHER";
        expenseByMethod[key] = (expenseByMethod[key] || 0) + Number(expense.amount || 0);
    }
    const methods = new Set([...Object.keys(byMethod), ...Object.keys(expenseByMethod)]);
    const balances = {};
    for (const key of methods) balances[key] = { sales: byMethod[key] || 0, expenses: expenseByMethod[key] || 0, net: (byMethod[key] || 0) - (expenseByMethod[key] || 0) };
    return { salesCount: sales.length, expenseCount: expenses.length, grossSales: sales.reduce((sum, sale) => sum + Number(sale.total || 0), 0), balances };
}
