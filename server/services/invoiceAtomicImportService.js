import { ObjectId } from "mongodb";
import { getMongoClient } from "../database/mongo.js";
import { ensureDefaultBranch, requireActiveBranch } from "./branchService.js";
import { getCollection } from "./index.js";
import { COLLECTIONS } from "../../shared/schemas/index.js";
import { validateProduct } from "../../shared/validators/index.js";
import { resolveUom, validateUomConfiguration } from "../../shared/uom.js";
import { MAX_INVOICE_ROWS } from "./invoiceImportService.js";

function fail(message, statusCode = 400) { const error = new Error(message); error.statusCode = statusCode; throw error; }
function text(value) { return String(value ?? "").trim(); }
function positive(value, label) { const n = Number(value); if (!Number.isFinite(n) || n <= 0) fail(`${label} must be greater than zero.`); return n; }

function productFilter(row, tenantId) {
    const filter = { tenantId };
    if (text(row.barcode)) return { ...filter, barcode: text(row.barcode) };
    return { ...filter, brandName: text(row.brandName), genericName: text(row.genericName), dosageForm: text(row.dosageForm) || "Unspecified", strength: row.strength == null ? null : text(row.strength) };
}

function validateRow(row, index) {
    if (!row || typeof row !== "object") fail(`Invoice row ${index + 1} is invalid.`);
    if (!text(row.brandName) && !text(row.genericName)) fail(`Invoice row ${index + 1} has no product identity.`);
    positive(row.quantity, `Invoice row ${index + 1} quantity`);
    if (!text(row.batchNumber)) fail(`Invoice row ${index + 1} batch number is required.`);
    const expiry = new Date(`${text(row.expiryDate)}T00:00:00`);
    if (!text(row.expiryDate) || Number.isNaN(expiry.getTime())) fail(`Invoice row ${index + 1} expiry date is invalid.`);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    if (expiry < today) fail(`Invoice row ${index + 1} is already expired.`);
    const conversion = positive(row.conversionToBase || 1, `Invoice row ${index + 1} conversion`);
    return { ...row, conversionToBase: conversion, expiryDate: expiry };
}

function buildNewProduct(row) {
    const baseUnit = "piece";
    const requestedUnit = text(row.uom).toLowerCase() || baseUnit;
    const matrix = [{ unit: baseUnit, conversionToBase: 1, sellingPrice: requestedUnit === baseUnit && row.sellingPrice != null ? Number(row.sellingPrice) : null, enabled: true }];
    if (requestedUnit !== baseUnit) matrix.push({ unit: requestedUnit, conversionToBase: Number(row.conversionToBase), sellingPrice: row.sellingPrice == null ? null : Number(row.sellingPrice), enabled: true });
    const uom = validateUomConfiguration(baseUnit, matrix);
    if (!uom.valid) fail(uom.errors.join(" "));
    return {
        brandName: text(row.brandName) || text(row.genericName),
        genericName: text(row.genericName) || text(row.brandName),
        dosageForm: text(row.dosageForm) || "Unspecified",
        category: text(row.category) || "Medicine",
        strength: row.strength == null ? null : text(row.strength),
        strengthUnit: row.strengthUnit == null ? null : text(row.strengthUnit),
        manufacturer: row.manufacturer == null ? null : text(row.manufacturer),
        registrationAgency: null,
        registrationNumber: null,
        baseUnit,
        uomMatrix: uom.uomMatrix,
        barcode: text(row.barcode) || null,
        stockQuantity: 0,
        catalogInstalled: false,
        catalogSource: "invoice-import",
        catalogFamilyId: null,
        catalogRxcui: null
    };
}

export async function commitInvoiceAtomic({ tenantId, createdBy, branchId, rows, filename }) {
    if (!Array.isArray(rows) || rows.length === 0) fail("No invoice rows were supplied.");
    if (rows.length > MAX_INVOICE_ROWS) fail(`Invoice contains more than ${MAX_INVOICE_ROWS} rows.`, 413);
    const normalizedRows = rows.map(validateRow);
    const activeBranch = text(branchId) || (await ensureDefaultBranch(tenantId)).branchId;
    await requireActiveBranch(tenantId, activeBranch);

    const client = getMongoClient();
    const db = client.db();
    const session = client.startSession();
    const results = [];
    try {
        await session.withTransaction(async () => {
            const products = db.collection(COLLECTIONS.PRODUCTS);
            const batches = db.collection(COLLECTIONS.BATCHES);
            const movements = db.collection(COLLECTIONS.STOCK_MOVEMENTS);
            const seenBatches = new Set();

            for (const row of normalizedRows) {
                const batchKey = `${tenantId}|${activeBranch}|${text(row.batchNumber).toLowerCase()}`;
                if (seenBatches.has(batchKey)) fail(`Duplicate batch number '${row.batchNumber}' in this invoice.`);
                seenBatches.add(batchKey);
                const duplicateBatch = await batches.findOne({ tenantId, branchId: activeBranch, batchNumber: text(row.batchNumber) }, { session });
                if (duplicateBatch) fail(`Batch number '${row.batchNumber}' already exists in this branch.`, 409);

                let product = await products.findOne(productFilter(row, tenantId), { session });
                let productCreated = false;
                if (!product) {
                    product = buildNewProduct(row);
                    const validation = validateProduct({ ...product, tenantId });
                    if (!validation.valid) fail(validation.error || `Invoice product row ${row.rowNumber || ""} is invalid.`);
                    const duplicate = await products.findOne({ tenantId, brandName: product.brandName, genericName: product.genericName, dosageForm: product.dosageForm, strength: product.strength }, { session });
                    if (duplicate) { product = duplicate; }
                    else {
                        const inserted = await products.insertOne({ tenantId, ...product, createdAt: new Date(), updatedAt: new Date() }, { session });
                        product = { ...product, _id: inserted.insertedId };
                        productCreated = true;
                    }
                }

                const requestedUnit = text(row.uom).toLowerCase() || text(product.baseUnit).toLowerCase() || "piece";
                const authoritative = resolveUom(product, requestedUnit);
                if (requestedUnit !== "piece" && Number(row.conversionToBase) !== Number(authoritative.conversionToBase)) fail(`UOM conversion mismatch for '${requestedUnit}' on invoice row ${row.rowNumber || ""}. Product configuration is authoritative.`);
                const baseQuantity = positive(row.quantity, "Quantity") * authoritative.conversionToBase;
                const costPerBase = row.costPrice == null ? null : Number(row.costPrice) / authoritative.conversionToBase;
                if (costPerBase != null && (!Number.isFinite(costPerBase) || costPerBase < 0)) fail(`Invalid cost price on invoice row ${row.rowNumber || ""}.`);
                const now = new Date();
                const batch = { tenantId, productId: new ObjectId(product._id), batchNumber: text(row.batchNumber), quantity: baseQuantity, expiryDate: row.expiryDate, branchId: activeBranch, costPrice: costPerBase, sellingPrice: null, location: null, supplierId: null, createdBy, createdAt: now, updatedAt: now };
                const batchResult = await batches.insertOne(batch, { session });
                await products.updateOne({ _id: product._id, tenantId }, { $inc: { stockQuantity: baseQuantity }, $set: { updatedAt: now } }, { session });
                await movements.insertOne({ tenantId, productId: product._id, batchId: batchResult.insertedId, type: "PURCHASE", quantity: baseQuantity, direction: "IN", branchId: activeBranch, reference: `INVOICE:${text(filename) || "upload"}:ROW:${row.rowNumber || ""}`, notes: "Stock received from invoice import", unitCost: costPerBase, createdBy, createdAt: now }, { session });
                results.push({ rowNumber: row.rowNumber, productId: String(product._id), productCreated, batchId: String(batchResult.insertedId), baseQuantity, uom: authoritative.unit, conversionToBase: authoritative.conversionToBase });
            }
        });
    } finally { await session.endSession(); }
    return { filename: text(filename), importedCount: results.length, productsCreated: results.filter(item => item.productCreated).length, batchesCreated: results.length, results };
}
