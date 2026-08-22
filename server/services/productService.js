// ==========================================
// Universal Pharmacy Platform
// Product Service
// ==========================================
import { ObjectId } from "mongodb";
import { COLLECTIONS } from "../../shared/schemas/index.js";
import { validateProduct } from "../../shared/validators/index.js";
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

    if (!ObjectId.isValid(productId)) {
        const error = new Error("Invalid product ID.");
        error.statusCode = 400;
        throw error;
    }

    return products.findOne({
        _id: new ObjectId(productId)
    });
}

export async function updateProduct(productId, data) {
    const products = getCollection(COLLECTIONS.PRODUCTS);

    if (!ObjectId.isValid(productId)) {
        const error = new Error("Invalid product ID.");
        error.statusCode = 400;
        throw error;
    }

    const _id = new ObjectId(productId);

    const existing = await products.findOne({ _id });

    if (!existing) {
    const error = new Error("Product not found.");
    error.statusCode = 404;
    throw error;
}
    const allowedFields = [
        "brandName",
        "genericName",
        "dosageForm",
        "category",
        "strength",
        "strengthUnit",
        "manufacturer",
        "registrationAgency",
        "registrationNumber",
        "baseUnit",
        "uomMatrix",
        "barcode"
    ];

    const updates = {};

    for (const field of allowedFields) {
        if (Object.prototype.hasOwnProperty.call(data, field)) {
            updates[field] = data[field];
        }
    }

    if (Object.keys(updates).length === 0) {
        const error = new Error("No valid product fields were provided.");
        error.statusCode = 400;
        throw error;
    }

    const candidate = {
        ...existing,
        ...updates
    };

    const validation = validateProduct(candidate);

    if (!validation.valid) {
        const error = new Error(
            `Missing required fields: ${validation.missing.join(", ")}`
        );

        error.statusCode = 400;
        throw error;
    }

    const duplicate = await products.findOne({
        _id: { $ne: _id },
        brandName: String(candidate.brandName || "").trim(),
        genericName: String(candidate.genericName || "").trim(),
        dosageForm: String(candidate.dosageForm || "").trim(),
        strength: candidate.strength ?? null
    });

    if (duplicate) {
        const error = new Error("A matching product already exists.");
        error.statusCode = 409;
        throw error;
    }

    updates.updatedAt = new Date();

    await products.updateOne(
        { _id },
        {
            $set: updates
        }
    );

    return products.findOne({ _id });
}

export async function deleteProduct(productId) {
    const products = getCollection(COLLECTIONS.PRODUCTS);

    if (!ObjectId.isValid(productId)) {
        const error = new Error("Invalid product ID.");
        error.statusCode = 400;
        throw error;
    }

    const _id = new ObjectId(productId);

    const existing = await products.findOne({ _id });

    if (!existing) {
    const error = new Error("Product not found.");
    error.statusCode = 404;
    throw error;
}

    await products.deleteOne({ _id });

    return {
        deleted: true,
        product: existing
    };
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