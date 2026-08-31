// ==========================================
// Universal Pharmacy Platform
// Batch Service
// ==========================================

import { ObjectId } from "mongodb";

import { COLLECTIONS } from "../../shared/schemas/index.js";

import {
    validateBatch
} from "../../shared/validators/index.js";

import { getCollection } from "./index.js";


function normalizeBatch(data) {
    return {
        productId:
            new ObjectId(
                String(data.productId).trim()
            ),

        batchNumber:
            String(
                data.batchNumber || ""
            ).trim(),

        quantity:
            Number(
                data.quantity
            ),

        expiryDate:
            new Date(
                data.expiryDate
            ),

        costPrice:
            data.costPrice === "" ||
            data.costPrice === undefined ||
            data.costPrice === null
                ? null
                : Number(
                    data.costPrice
                ),

        sellingPrice:
            data.sellingPrice === "" ||
            data.sellingPrice === undefined ||
            data.sellingPrice === null
                ? null
                : Number(
                    data.sellingPrice
                ),

        location:
            data.location
                ? String(
                    data.location
                ).trim()
                : null,

        createdAt:
            new Date(),

        updatedAt:
            new Date()
    };
}


export async function createBatch(data) {

    if (!ObjectId.isValid(data.productId)) {
        const error = new Error("Invalid product ID.");

        error.statusCode = 400;

        throw error;
    }


    const validation = validateBatch(data);

    if (!validation.valid) {
        const error = new Error(
            validation.error ||
            `Missing required fields: ${
                validation.missing.join(", ")
            }`
        );

        error.statusCode = 400;

        throw error;
    }


    const products =
        getCollection(COLLECTIONS.PRODUCTS);

    const product =
        await products.findOne({
            _id: new ObjectId(data.productId)
        });


    if (!product) {
        const error =
            new Error("Product not found.");

        error.statusCode = 404;

        throw error;
    }


    const batches =
        getCollection(COLLECTIONS.BATCHES);

    const batch =
        normalizeBatch(data);


    const duplicate =
        await batches.findOne({
            productId: batch.productId,
            batchNumber: batch.batchNumber
        });


    if (duplicate) {
        const error = new Error(
            "This batch number already exists for the selected product."
        );

        error.statusCode = 409;

        throw error;
    }


    const result =
        await batches.insertOne(batch);


    return {
        ...batch,
        _id: result.insertedId
    };
}


export async function getBatchById(batchId) {

    if (!ObjectId.isValid(batchId)) {
        const error =
            new Error("Invalid batch ID.");

        error.statusCode = 400;

        throw error;
    }


    const batches =
        getCollection(COLLECTIONS.BATCHES);


    return batches.findOne({
        _id: new ObjectId(batchId)
    });
}


export async function updateBatch(
    batchId,
    data
) {

    if (!ObjectId.isValid(batchId)) {
        const error =
            new Error("Invalid batch ID.");

        error.statusCode = 400;

        throw error;
    }


    const batches =
        getCollection(COLLECTIONS.BATCHES);

    const _id =
        new ObjectId(batchId);


    const existing =
        await batches.findOne({ _id });


    if (!existing) {
        const error =
            new Error("Batch not found.");

        error.statusCode = 404;

        throw error;
    }


    const allowedFields = [
    "batchNumber",
    "quantity",
    "expiryDate",
    "costPrice",
    "sellingPrice",
    "location"
];

    const updates = {};


    for (const field of allowedFields) {
        if (
            Object.prototype.hasOwnProperty.call(
                data,
                field
            )
        ) {
            updates[field] =
                data[field];
        }
    }


    if (
        Object.keys(updates).length === 0
    ) {
        const error = new Error(
            "No valid batch fields were provided."
        );

        error.statusCode = 400;

        throw error;
    }


    if (
        Object.prototype.hasOwnProperty.call(
            updates,
            "batchNumber"
        )
    ) {
        updates.batchNumber =
            String(
                updates.batchNumber || ""
            ).trim();
    }


    if (
        Object.prototype.hasOwnProperty.call(
            updates,
            "quantity"
        )
    ) {
        updates.quantity =
            Number(updates.quantity);
    }


    if (
        Object.prototype.hasOwnProperty.call(
            updates,
            "expiryDate"
        )
    ) {
        updates.expiryDate =
            new Date(updates.expiryDate);
    }

if (
    Object.prototype.hasOwnProperty.call(
        updates,
        "costPrice"
    )
) {
    updates.costPrice =
        updates.costPrice === "" ||
        updates.costPrice === null
            ? null
            : Number(
                updates.costPrice
            );
}


if (
    Object.prototype.hasOwnProperty.call(
        updates,
        "sellingPrice"
    )
) {
    updates.sellingPrice =
        updates.sellingPrice === "" ||
        updates.sellingPrice === null
            ? null
            : Number(
                updates.sellingPrice
            );
}


if (
    Object.prototype.hasOwnProperty.call(
        updates,
        "location"
    )
) {
    updates.location =
        updates.location
            ? String(
                updates.location
            ).trim()
            : null;
}


    const candidate = {
        ...existing,
        ...updates
    };


    const validation =
        validateBatch(candidate);


    if (!validation.valid) {
        const error = new Error(
            validation.error ||
            `Missing required fields: ${
                validation.missing.join(", ")
            }`
        );

        error.statusCode = 400;

        throw error;
    }


    const duplicate =
        await batches.findOne({
            _id: { $ne: _id },

            productId:
                existing.productId,

            batchNumber:
                candidate.batchNumber
        });


    if (duplicate) {
        const error = new Error(
            "This batch number already exists for the selected product."
        );

        error.statusCode = 409;

        throw error;
    }


    updates.updatedAt =
        new Date();


    await batches.updateOne(
        { _id },
        {
            $set: updates
        }
    );


    return batches.findOne({ _id });
}


export async function deleteBatch(batchId) {

    if (!ObjectId.isValid(batchId)) {
        const error =
            new Error("Invalid batch ID.");

        error.statusCode = 400;

        throw error;
    }


    const batches =
        getCollection(COLLECTIONS.BATCHES);

    const transactions =
        getCollection(COLLECTIONS.TRANSACTIONS);

    const stockMovements =
        getCollection(
            COLLECTIONS.STOCK_MOVEMENTS
        );


    const _id =
        new ObjectId(batchId);


    const existing =
        await batches.findOne({ _id });


    if (!existing) {
        const error =
            new Error("Batch not found.");

        error.statusCode = 404;

        throw error;
    }


    const existingTransaction =
        await transactions.findOne({
            "items.batchId": _id
        });


    if (existingTransaction) {
        const error =
            new Error(
                "Cannot delete batch with transaction history."
            );

        error.statusCode = 409;

        throw error;
    }


    const existingStockMovement =
        await stockMovements.findOne({
            batchId: _id
        });


    if (existingStockMovement) {
        const error =
            new Error(
                "Cannot delete batch with stock movement history."
            );

        error.statusCode = 409;

        throw error;
    }


    await batches.deleteOne({
        _id
    });


    return {
        deleted: true,
        batch: existing
    };
}

export async function listBatches(
    options = {}
) {

    const batches =
        getCollection(COLLECTIONS.BATCHES);


    const limit = Math.min(
        Math.max(
            Number(options.limit) || 50,
            1
        ),
        100
    );


    const skip = Math.max(
        Number(options.skip) || 0,
        0
    );


    const query = {};


    if (options.productId) {

        if (
            !ObjectId.isValid(
                options.productId
            )
        ) {
            const error =
                new Error(
                    "Invalid product ID."
                );

            error.statusCode = 400;

            throw error;
        }


        query.productId =
            new ObjectId(
                options.productId
            );
    }


    return batches
        .find(query)
        .sort({
            expiryDate: 1,
            createdAt: -1
        })
        .skip(skip)
        .limit(limit)
        .toArray();
}
