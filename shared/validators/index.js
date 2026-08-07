// ==========================================
// Universal Pharmacy Platform
// Shared Validation Rules
// ==========================================

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
    const required = [
        "brandName",
        "genericName",
        "dosageForm",
        "category"
    ];

    return requireFields(product, required);
}

export function validateBatch(batch) {
    const required = [
        "productId",
        "batchNumber",
        "quantity",
        "expiryDate"
    ];

    const result = requireFields(batch, required);

    if (!result.valid) {
        return result;
    }

    if (!isNonNegativeNumber(batch.quantity)) {
        return {
            valid: false,
            missing: [],
            error: "Quantity must be zero or greater."
        };
    }

    if (!isValidDate(batch.expiryDate)) {
        return {
            valid: false,
            missing: [],
            error: "Invalid expiry date."
        };
    }

    return {
        valid: true,
        missing: []
    };
}