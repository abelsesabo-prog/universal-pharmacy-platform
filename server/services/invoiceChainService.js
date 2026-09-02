import { ObjectId } from "mongodb";
import { getMongoClient } from "../database/mongo.js";
import { COLLECTIONS } from "../../shared/schemas/index.js";
import { canonicalProductIdentity, resolveExistingInvoiceProduct } from "./invoiceProductResolver.js";
import { resolveUom } from "../../shared/uom.js";

function text(value) { return String(value ?? "").trim(); }
function fail(message, statusCode = 400) { const error = new Error(message); error.statusCode = statusCode; throw error; }
function positive(value, label) { const n = Number(value); if (!Number.isFinite(n) || n <= 0) fail(`${label} must be greater than zero.`); return n; }

export function validateInvoiceChainRequest(input = {}) {
    const errors = [];
    if (!text(input.tenantId)) errors.push("tenantId is required.");
    if (!Array.isArray(input.rows) || input.rows.length === 0) errors.push("rows must be a non-empty array.");
    return { valid: errors.length === 0, errors };
}

export async function planInvoiceChain({ tenantId, rows }) {
    const validation = validateInvoiceChainRequest({ tenantId, rows });
    if (!validation.valid) fail(validation.errors.join(" "), 400);

    const client = getMongoClient();
    const session = client.startSession();
    try {
        return await session.withTransaction(async () => {
            const db = client.db();
            const plans = [];
            for (const row of rows) {
                const product = await resolveExistingInvoiceProduct(row, tenantId, session);
                const identityKey = product ? canonicalProductIdentity(product) : null;
                const requestedUnit = text(row.uom).toLowerCase() || text(product?.baseUnit).toLowerCase() || "piece";
                const authoritativeUom = product ? resolveUom(product, requestedUnit) : null;
                const quantity = positive(row.quantity, "Invoice quantity");
                const baseQuantity = authoritativeUom ? quantity * authoritativeUom.conversionToBase : quantity * positive(row.conversionToBase || 1, "Invoice conversion");
                plans.push({
                    rowNumber: row.rowNumber ?? null,
                    action: product ? "REUSE_PRODUCT" : "CREATE_PRODUCT",
                    productId: product ? String(product._id) : null,
                    identityKey,
                    productIdentity: product ? {
                        brandName: product.brandName,
                        genericName: product.genericName,
                        dosageForm: product.dosageForm,
                        strength: product.strength
                    } : {
                        brandName: text(row.brandName) || text(row.genericName),
                        genericName: text(row.genericName) || text(row.brandName),
                        dosageForm: text(row.dosageForm) || "Unspecified",
                        strength: row.strength ?? null
                    },
                    uom: authoritativeUom?.unit || requestedUnit,
                    conversionToBase: authoritativeUom?.conversionToBase || Number(row.conversionToBase || 1),
                    quantity,
                    baseQuantity,
                    batchNumber: text(row.batchNumber)
                });
            }
            return { tenantId: text(tenantId), plans };
        });
    } finally {
        await session.endSession();
    }
}
