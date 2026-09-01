// ==========================================
// Universal Pharmacy Platform
// Universal Unit-of-Measure Engine
// ==========================================

const DEFAULT_BASE_UNIT = "piece";

function cleanUnit(value) {
    return String(value || "")
        .trim()
        .toLowerCase();
}

function asPositiveNumber(value) {
    const number = Number(value);

    return Number.isFinite(number) && number > 0
        ? number
        : null;
}

function asNonNegativeNumber(value) {
    const number = Number(value);

    return Number.isFinite(number) && number >= 0
        ? number
        : null;
}

function normalizeEntry(entry, fallbackUnit = "") {
    const source =
        typeof entry === "object" && entry !== null
            ? entry
            : {
                conversionToBase: entry
            };

    const unit = cleanUnit(
        source.unit ||
        source.uom ||
        source.name ||
        fallbackUnit
    );

    const conversionToBase = Number(
        source.conversionToBase ??
        source.conversion ??
        source.factor ??
        source.multiplier ??
        0
    );

    const rawPrice =
        source.sellingPrice ??
        source.price;

    const sellingPrice =
        rawPrice === undefined ||
        rawPrice === null ||
        rawPrice === ""
            ? null
            : Number(rawPrice);

    const enabled =
        source.enabled === undefined
            ? source.active !== false
            : source.enabled !== false;

    return {
        unit,
        conversionToBase,
        sellingPrice,
        enabled
    };
}

export function normalizeUomMatrix(matrix) {
    if (matrix === undefined || matrix === null || matrix === "") {
        return null;
    }

    if (Array.isArray(matrix)) {
        return matrix.map(entry => normalizeEntry(entry));
    }

    if (typeof matrix !== "object") {
        return null;
    }

    return Object.entries(matrix).map(
        ([unit, value]) =>
            normalizeEntry(value, unit)
    );
}

export function validateUomConfiguration(
    baseUnit,
    matrix
) {
    const normalizedBaseUnit =
        cleanUnit(baseUnit);

    const normalizedMatrix =
        normalizeUomMatrix(matrix);

    // Null/empty values mean the product is using the legacy implicit base unit.
    if (
        !normalizedBaseUnit &&
        (matrix === undefined ||
            matrix === null ||
            matrix === "")
    ) {
        return {
            valid: true,
            baseUnit: null,
            uomMatrix: null,
            errors: []
        };
    }

    const errors = [];

    if (!normalizedBaseUnit) {
        errors.push(
            "baseUnit is required when UOM configuration is provided."
        );
    }

    if (!normalizedMatrix || normalizedMatrix.length === 0) {
        errors.push(
            "uomMatrix must contain at least one UOM entry."
        );
    }

    const seenUnits = new Set();

    for (const entry of normalizedMatrix || []) {
        if (!entry.unit) {
            errors.push("Every UOM entry requires a unit.");
            continue;
        }

        if (seenUnits.has(entry.unit)) {
            errors.push(
                `Duplicate UOM entry: ${entry.unit}.`
            );
        }

        seenUnits.add(entry.unit);

        if (!asPositiveNumber(entry.conversionToBase)) {
            errors.push(
                `UOM '${entry.unit}' conversionToBase must be greater than zero.`
            );
        }

        if (
            entry.sellingPrice !== null &&
            asNonNegativeNumber(entry.sellingPrice) === null
        ) {
            errors.push(
                `UOM '${entry.unit}' sellingPrice must be zero or greater.`
            );
        }
    }

    const baseEntry =
        (normalizedMatrix || []).find(
            entry =>
                entry.unit === normalizedBaseUnit
        );

    if (!baseEntry) {
        errors.push(
            `uomMatrix must define the baseUnit '${normalizedBaseUnit}'.`
        );
    } else if (baseEntry.conversionToBase !== 1) {
        errors.push(
            "The baseUnit conversionToBase must equal 1."
        );
    }

    return {
        valid: errors.length === 0,
        baseUnit: normalizedBaseUnit || null,
        uomMatrix: normalizedMatrix,
        errors
    };
}

export function resolveUom(
    product,
    requestedUnit
) {
    const baseUnit =
        cleanUnit(product?.baseUnit) ||
        DEFAULT_BASE_UNIT;

    const matrix =
        normalizeUomMatrix(product?.uomMatrix);

    if (!matrix || matrix.length === 0) {
        return {
            unit: baseUnit,
            conversionToBase: 1,
            sellingPrice: null,
            configured: false
        };
    }

    const unit =
        cleanUnit(requestedUnit) ||
        baseUnit;

    const entry = matrix.find(
        candidate =>
            candidate.unit === unit &&
            candidate.enabled !== false
    );

    if (!entry) {
        const error = new Error(
            `Unit '${unit}' is not configured for this product.`
        );

        error.statusCode = 400;
        throw error;
    }

    return {
        unit: entry.unit,
        conversionToBase: entry.conversionToBase,
        sellingPrice: entry.sellingPrice,
        configured: true
    };
}

export function calculateUomSale(
    product,
    quantity,
    requestedUnit,
    suppliedUnitPrice
) {
    const saleQuantity = Number(quantity);

    if (
        !Number.isFinite(saleQuantity) ||
        saleQuantity <= 0
    ) {
        const error = new Error(
            "Transaction item quantity must be greater than zero."
        );

        error.statusCode = 400;
        throw error;
    }

    const uom = resolveUom(
        product,
        requestedUnit
    );

    const suppliedPrice =
        suppliedUnitPrice === undefined ||
        suppliedUnitPrice === null ||
        suppliedUnitPrice === ""
            ? null
            : Number(suppliedUnitPrice);

    if (
        suppliedPrice !== null &&
        (!Number.isFinite(suppliedPrice) ||
            suppliedPrice < 0)
    ) {
        const error = new Error(
            "Transaction item unit price must be valid."
        );

        error.statusCode = 400;
        throw error;
    }

    let unitPrice = suppliedPrice;

    if (uom.sellingPrice !== null) {
        unitPrice = uom.sellingPrice;

        if (
            suppliedPrice !== null &&
            suppliedPrice !== uom.sellingPrice
        ) {
            const error = new Error(
                `Unit price for UOM '${uom.unit}' must match its configured sellingPrice.`
            );

            error.statusCode = 400;
            throw error;
        }
    }

    if (
        unitPrice === null ||
        !Number.isFinite(unitPrice) ||
        unitPrice < 0
    ) {
        const error = new Error(
            `No valid selling price is configured for UOM '${uom.unit}'.`
        );

        error.statusCode = 400;
        throw error;
    }

    return {
        unit: uom.unit,
        quantity: saleQuantity,
        conversionToBase: uom.conversionToBase,
        baseQuantity:
            saleQuantity * uom.conversionToBase,
        unitPrice,
        lineTotal:
            saleQuantity * unitPrice
    };
}