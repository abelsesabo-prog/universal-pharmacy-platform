// ==========================================
// Universal Pharmacy Platform
// Product Service
// ==========================================

import { COLLECTIONS, PRODUCT_SCHEMA } from "../../shared/schemas/index.js";
import {
    requireFields,
    validateProduct
} from "../../shared/validators/index.js";
import { getCollection } from "./index.js";

function normalizeProduct(data) {
    return {
        brandName: String(data.brandName || "").trim(),
        genericName: String(data.genericName || "").trim(),
        dosageForm: String(data.dosageForm || "").trim(),
        category: String(data.category || "").trim(),
        strength: data.strength ?? null,
        strengthUnit: data.strengthUnit ?? null,
        manufacturer: data.manufacturer ?? null,
        registrationAgency: data.registrationAgency ?? null,
        registrationNumber: data.registrationNumber ?? null,
        baseUnit: data.baseUnit ?? null,
        uomMatrix: data.uomMatrix ?? null,
        barcode: data.barcode ?? null,
        createdAt: new Date(),
        updatedAt: new Date()
    };
}

export async function createProduct(data) {
    const validation = validateProduct(data);

    if (!validation.valid) {
        const error = new Error(
            `Missing required fields: ${validation.missing.join(", ")}`
        );

        error.statusCode = 400;
        throw error;
    }

    const products = getCollection(COLLECTIONS.PRODUCTS);

    const product = normalizeProduct(data);

    const duplicate = await products.findOne({
        brandName: product.brandName,
        genericName: product.genericName,
        dosageForm: product.dosageForm,
        strength: product.strength
    });

    if (duplicate) {
        const error = new Error("A matching product already exists.");

        error.statusCode = 409;
        throw error;
    }

    const result = await products.insertOne(product);

    return {
        ...product,
        _id: result.insertedId
    };
}

export async function getProductById(productId) {
    const products = getCollection(COLLECTIONS.PRODUCTS);

    return products.findOne({
        _id: productId
    });
}

export async function listProducts(options = {}) {
    const products = getCollection(COLLECTIONS.PRODUCTS);

    const limit = Math.min(
        Math.max(Number(options.limit) || 50, 1),
        100
    );

    const skip = Math.max(Number(options.skip) || 0, 0);

    return products
        .find({})
        .sort({ brandName: 1, genericName: 1 })
        .skip(skip)
        .limit(limit)
        .toArray();
}