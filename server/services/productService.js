import { ObjectId } from "mongodb";
import { COLLECTIONS } from "../../shared/schemas/index.js";
import { validateProduct } from "../../shared/validators/index.js";
import { validateUomConfiguration } from "../../shared/uom.js";
import { getCollection } from "./index.js";
import { buildProductIdentityKey } from "./invoiceProductResolver.js";

function assertTenantId(tenantId) {
    const normalized = String(tenantId || "").trim();
    if (!normalized) { const error = new Error("Tenant context is required."); error.statusCode = 403; throw error; }
    return normalized;
}

function normalizeProduct(data, tenantId) {
    const uomValidation = validateUomConfiguration(data.baseUnit, data.uomMatrix);
    if (!uomValidation.valid) {
        const error = new Error(uomValidation.errors.join(" "));
        error.statusCode = 400;
        throw error;
    }
    return {
        tenantId: assertTenantId(tenantId),
        brandName: String(data.brandName || "").trim(),
        genericName: String(data.genericName || "").trim(),
        dosageForm: String(data.dosageForm || "").trim(),
        category: String(data.category || "").trim(),
        strength: data.strength ?? null,
        strengthUnit: data.strengthUnit ?? null,
        manufacturer: data.manufacturer ?? null,
        registrationAgency: data.registrationAgency ?? null,
        registrationNumber: data.registrationNumber ?? null,
        baseUnit: uomValidation.baseUnit,
        uomMatrix: uomValidation.uomMatrix,
        barcode: data.barcode ?? null,
        stockQuantity: Number.isFinite(Number(data.stockQuantity)) ? Number(data.stockQuantity) : 0,
        catalogInstalled: data.catalogInstalled === true,
        catalogSource: data.catalogSource ?? null,
        catalogFamilyId: data.catalogFamilyId ?? null,
        catalogRxcui: data.catalogRxcui ?? null,
        createdAt: new Date(),
        updatedAt: new Date()
    };
}

export async function createProduct(data, tenantId) {
    const scopedTenantId = assertTenantId(tenantId);
    const validation = validateProduct({ ...data, tenantId: scopedTenantId });
    if (!validation.valid) { const error = new Error(validation.error || `Missing required fields: ${validation.missing.join(", ")}`); error.statusCode = 400; throw error; }
    const uomValidation = validateUomConfiguration(data.baseUnit, data.uomMatrix);
    if (!uomValidation.valid) { const error = new Error(uomValidation.errors.join(" ")); error.statusCode = 400; throw error; }
    const products = getCollection(COLLECTIONS.PRODUCTS);
    const product = normalizeProduct(data, scopedTenantId);
    const identityKey = buildProductIdentityKey(product);
    const duplicate = await products.findOne({ tenantId: scopedTenantId, identityKey });
    if (duplicate) { const error = new Error("A matching product already exists."); error.statusCode = 409; throw error; }
    const result = await products.insertOne({ ...product, identityKey });
    return { ...product, identityKey, _id: result.insertedId };
}

export async function getProductById(productId, tenantId) {
    const scopedTenantId = assertTenantId(tenantId);
    if (!ObjectId.isValid(productId)) { const error = new Error("Invalid product ID."); error.statusCode = 400; throw error; }
    return getCollection(COLLECTIONS.PRODUCTS).findOne({ _id: new ObjectId(productId), tenantId: scopedTenantId });
}

export async function updateProduct(productId, data, tenantId) {
    const scopedTenantId = assertTenantId(tenantId);
    if (!ObjectId.isValid(productId)) { const error = new Error("Invalid product ID."); error.statusCode = 400; throw error; }
    const products = getCollection(COLLECTIONS.PRODUCTS);
    const _id = new ObjectId(productId);
    const existing = await products.findOne({ _id, tenantId: scopedTenantId });
    if (!existing) { const error = new Error("Product not found."); error.statusCode = 404; throw error; }
    const allowedFields = ["brandName", "genericName", "dosageForm", "category", "strength", "strengthUnit", "manufacturer", "registrationAgency", "registrationNumber", "baseUnit", "uomMatrix", "barcode"];
    const updates = {};
    for (const field of allowedFields) if (Object.prototype.hasOwnProperty.call(data, field)) updates[field] = data[field];
    if (Object.keys(updates).length === 0) { const error = new Error("No valid product fields were provided."); error.statusCode = 400; throw error; }
    const candidate = { ...existing, ...updates, tenantId: scopedTenantId };
    const validation = validateProduct(candidate);
    if (!validation.valid) { const error = new Error(validation.error || `Missing required fields: ${validation.missing.join(", ")}`); error.statusCode = 400; throw error; }
    if (Object.prototype.hasOwnProperty.call(updates, "baseUnit") || Object.prototype.hasOwnProperty.call(updates, "uomMatrix")) {
        const uomValidation = validateUomConfiguration(candidate.baseUnit, candidate.uomMatrix);
        if (!uomValidation.valid) { const error = new Error(uomValidation.errors.join(" ")); error.statusCode = 400; throw error; }
        updates.baseUnit = uomValidation.baseUnit;
        updates.uomMatrix = uomValidation.uomMatrix;
    }
    const identityKey = buildProductIdentityKey(candidate);
    const duplicate = await products.findOne({ _id: { $ne: _id }, tenantId: scopedTenantId, identityKey });
    if (duplicate) { const error = new Error("A matching product already exists."); error.statusCode = 409; throw error; }
    updates.identityKey = identityKey;
    updates.updatedAt = new Date();
    await products.updateOne({ _id, tenantId: scopedTenantId }, { $set: updates });
    return products.findOne({ _id, tenantId: scopedTenantId });
}

export async function deleteProduct(productId, tenantId) {
    const scopedTenantId = assertTenantId(tenantId);
    if (!ObjectId.isValid(productId)) { const error = new Error("Invalid product ID."); error.statusCode = 400; throw error; }
    const products = getCollection(COLLECTIONS.PRODUCTS);
    const _id = new ObjectId(productId);
    const existing = await products.findOne({ _id, tenantId: scopedTenantId });
    if (!existing) { const error = new Error("Product not found."); error.statusCode = 404; throw error; }
    await products.deleteOne({ _id, tenantId: scopedTenantId });
    return { deleted: true, product: existing };
}

export async function listProducts(options = {}, tenantId) {
    const scopedTenantId = assertTenantId(tenantId);
    const limit = Math.min(Math.max(Number(options.limit) || 50, 1), 100);
    const skip = Math.max(Number(options.skip) || 0, 0);
    return getCollection(COLLECTIONS.PRODUCTS).find({ tenantId: scopedTenantId }).sort({ brandName: 1, genericName: 1 }).skip(skip).limit(limit).toArray();
}
