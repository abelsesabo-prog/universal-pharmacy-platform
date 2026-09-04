import { toMinorUnits } from "./ledgerService.js";

const CURRENCIES = new Set(["TZS", "USD", "KES", "UGX", "EUR"]);
const TAX_TYPES = new Set(["NONE", "VAT"]);

function fail(message, statusCode = 400) {
    const error = new Error(message);
    error.statusCode = statusCode;
    throw error;
}

function text(value) { return String(value ?? "").trim(); }

export function validateAccountingPolicy(input = {}) {
    const currency = text(input.currency || "TZS").toUpperCase();
    if (!CURRENCIES.has(currency)) fail(`Unsupported accounting currency: ${currency || "empty"}.`);

    const taxType = text(input.taxType || "NONE").toUpperCase();
    if (!TAX_TYPES.has(taxType)) fail(`Unsupported tax type: ${taxType || "empty"}.`);

    const taxRate = Number(input.taxRate ?? 0);
    if (!Number.isFinite(taxRate) || taxRate < 0 || taxRate > 100) fail("Tax rate must be between 0 and 100 percent.");
    if (taxType === "NONE" && taxRate !== 0) fail("Tax rate must be zero when tax type is NONE.");

    const exchangeRate = input.exchangeRate == null ? null : Number(input.exchangeRate);
    if (exchangeRate != null && (!Number.isFinite(exchangeRate) || exchangeRate <= 0)) fail("Exchange rate must be greater than zero.");

    const rateAsMinor = taxRate === 0 ? 0n : toMinorUnits(taxRate.toFixed(2));
    return Object.freeze({
        currency,
        taxType,
        taxRate,
        taxRateBasisPoints: Number(rateAsMinor),
        exchangeRate,
        exchangeRateSource: text(input.exchangeRateSource) || null,
        effectiveAt: input.effectiveAt ? new Date(input.effectiveAt) : new Date()
    });
}

export function calculateTax(amount, policy = {}) {
    const baseMinor = toMinorUnits(amount);
    if (baseMinor < 0n) fail("Taxable amount cannot be negative.");
    const validated = validateAccountingPolicy(policy);
    if (validated.taxType === "NONE" || validated.taxRate === 0) return { baseMinor, taxMinor: 0n, totalMinor: baseMinor };
    const rateBasisPoints = BigInt(Math.round(validated.taxRate * 100));
    const taxMinor = (baseMinor * rateBasisPoints + 5000n) / 10000n;
    return { baseMinor, taxMinor, totalMinor: baseMinor + taxMinor };
}

export function assertPeriodOpen(period = {}) {
    if (period.closed === true) fail("Accounting period is closed.", 409);
    const startsAt = period.startsAt ? new Date(period.startsAt) : null;
    const endsAt = period.endsAt ? new Date(period.endsAt) : null;
    const now = period.at ? new Date(period.at) : new Date();
    if (startsAt && Number.isNaN(startsAt.getTime())) fail("Invalid accounting period start.");
    if (endsAt && Number.isNaN(endsAt.getTime())) fail("Invalid accounting period end.");
    if (Number.isNaN(now.getTime())) fail("Invalid accounting timestamp.");
    if (startsAt && now < startsAt) fail("Transaction falls before the accounting period.", 409);
    if (endsAt && now >= endsAt) fail("Transaction falls outside the accounting period.", 409);
    return true;
}
