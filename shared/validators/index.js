// ==========================================
// Universal Pharmacy Platform
// Shared Validation Rules
// ==========================================

import { validateUomConfiguration } from "../uom.js";

export function requireFields(data, fields) {
    const missing = fields.filter(
        field =>
            data[field] === undefined ||
            data[field] === null ||
            data[field] === ""
    );

    return {
        valid: missing.length === 0,
        missing
    };
}

export function isPositiveNumber(value) {
    return Number.isFinite(Number(value)) && Number(value) > 0;
}

export function isNonNegativeNumber(value) {
    return Number.isFinite(Number(value)) && Number(value) >= 0;
}

export function isValidDate(value) {
    if (!value) return false;
    const date = new Date(value);
    return !Number.isNaN(date.getTime());
}

export function validateProduct(product) {
    const required = ["brandName", "genericName", "dosageForm", "category"];
    const result = requireFields(product, required);
    if (!result.valid) return result;

    const hasBaseUnit = product.baseUnit !== undefined && product.baseUnit !== null && product.baseUnit !== "";
    const hasUomMatrix = product.uomMatrix !== undefined && product.uomMatrix !== null && product.uomMatrix !== "";

    if (hasBaseUnit || hasUomMatrix) {
        const uomValidation = validateUomConfiguration(product.baseUnit, product.uomMatrix);
        if (!uomValidation.valid) {
            return { valid: false, missing: [], error: uomValidation.errors.join(" ") };
        }
    }

    return { valid: true, missing: [] };
}

export function validateBatch(batch) {
    const required = ["productId", "batchNumber", "quantity", "expiryDate"];
    const result = requireFields(batch, required);
    if (!result.valid) return result;
    if (!isNonNegativeNumber(batch.quantity)) return { valid: false, missing: [], error: "Quantity must be zero or greater." };
    if (!isValidDate(batch.expiryDate)) return { valid: false, missing: [], error: "Invalid expiry date." };
    if (batch.costPrice !== undefined && batch.costPrice !== null && batch.costPrice !== "" && !isNonNegativeNumber(batch.costPrice)) return { valid: false, missing: [], error: "Cost price must be zero or greater." };
    if (batch.sellingPrice !== undefined && batch.sellingPrice !== null && batch.sellingPrice !== "" && !isNonNegativeNumber(batch.sellingPrice)) return { valid: false, missing: [], error: "Selling price must be zero or greater." };
    return { valid: true, missing: [] };
}