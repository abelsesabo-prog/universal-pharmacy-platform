// ==========================================
// Universal Pharmacy Platform
// Transaction Service
// ==========================================

import { ObjectId } from "mongodb";

import {
    COLLECTIONS
} from "../../shared/schemas/index.js";

import {
    calculateUomSale
} from "../../shared/uom.js";

import {
    getCollection
} from "./index.js";

import {
    createStockMovement
} from "./stockMovementService.js";


// ==========================================
// CREATE TRANSACTION
// ==========================================

export async function createTransaction(
    data
) {

    const transactions =
        getCollection(
            COLLECTIONS.TRANSACTIONS
        );

    const products =
        getCollection(
            COLLECTIONS.PRODUCTS
        );

    const batches =
        getCollection(
            COLLECTIONS.BATCHES
        );


    const items =
        Array.isArray(data.items)
            ? data.items
            : [];


    if (items.length === 0) {

        const error =
            new Error(
                "Transaction must contain at least one item."
            );

        error.statusCode = 400;

        throw error;
    }


    const transactionItems = [];

    const validatedBatches = [];


    let totalAmount = 0;


    // ------------------------------------------
    // VALIDATE EVERY LINE BEFORE WRITING
    // ------------------------------------------

    for (
        const item
        of items
    ) {

        if (
            !ObjectId.isValid(
                item.productId
            )
        ) {

            const error =
                new Error(
                    "Invalid product ID in transaction item."
                );

            error.statusCode = 400;

            throw error;
        }


        if (
            !ObjectId.isValid(
                item.batchId
            )
        ) {

            const error =
                new Error(
                    "Invalid batch ID in transaction item."
                );

            error.statusCode = 400;

            throw error;
        }


        const productId =
            new ObjectId(
                item.productId
            );

        const batchId =
            new ObjectId(
                item.batchId
            );


        const product =
            await products.findOne({
                _id: productId
            });


        if (!product) {

            const error =
                new Error(
                    "Product not found for transaction item."
                );

            error.statusCode = 404;

            throw error;
        }


        const batch =
            await batches.findOne({
                _id: batchId
            });


        if (!batch) {

            const error =
                new Error(
                    "Batch not found for transaction item."
                );

            error.statusCode = 404;

            throw error;
        }


        // A batch can only be sold against its owning product.
        if (
            String(batch.productId) !==
            String(productId)
        ) {

            const error =
                new Error(
                    "Selected batch does not belong to the selected product."
                );

            error.statusCode = 409;

            throw error;
        }


        // Expired stock must never reach the cashier sale path.
        if (
            batch.expiryDate &&
            !Number.isNaN(
                new Date(
                    batch.expiryDate
                ).getTime()
            ) &&
            new Date(
                batch.expiryDate
            ).getTime() < Date.now()
        ) {

            const error =
                new Error(
                    "Cannot sell an expired batch."
                );

            error.statusCode = 400;

            throw error;
        }


        const sale =
            calculateUomSale(
                product,
                item.quantity,
                item.uom,
                item.unitPrice
            );


        const availableQuantity =
            Number(
                batch.quantity
            );


        if (
            !Number.isFinite(
                availableQuantity
            ) ||
            availableQuantity < 0
        ) {

            const error =
                new Error(
                    "Batch stock quantity is invalid."
                );

            error.statusCode = 500;

            throw error;
        }


        if (
            sale.baseQuantity >
            availableQuantity
        ) {

            const error =
                new Error(
                    `Insufficient stock. Current batch quantity is ${availableQuantity}.`
                );

            error.statusCode = 400;

            throw error;
        }


        totalAmount +=
            sale.lineTotal;


        transactionItems.push({

            productId,

            batchId,

            quantity:
                sale.quantity,

            uom:
                sale.unit,

            conversionToBase:
                sale.conversionToBase,

            baseQuantity:
                sale.baseQuantity,

            unitPrice:
                sale.unitPrice,

            lineTotal:
                sale.lineTotal

        });

        validatedBatches.push({
            batch,
            baseQuantity:
                sale.baseQuantity
        });
    }


    // ------------------------------------------
    // AGGREGATE REPEATED BATCH USAGE
    // ------------------------------------------

    const batchUsage =
        new Map();


    for (
        const item
        of validatedBatches
    ) {

        const key =
            String(
                item.batch._id
            );

        batchUsage.set(
            key,
            (batchUsage.get(key) || 0) +
                item.baseQuantity
        );
    }


    for (
        const item
        of validatedBatches
    ) {

        const totalRequested =
            batchUsage.get(
                String(
                    item.batch._id
                )
            );

        if (
            totalRequested >
            Number(item.batch.quantity)
        ) {

            const error =
                new Error(
                    `Insufficient stock. Current batch quantity is ${item.batch.quantity}.`
                );

            error.statusCode = 400;

            throw error;
        }
    }


    // ------------------------------------------
    // CREATE TRANSACTION RECORD
    // ------------------------------------------

    const transaction = {

        type:
            "SALE",

        items:
            transactionItems,

        totalAmount,

        paymentMethod:
            data.paymentMethod
                ? String(
                    data.paymentMethod
                ).trim()
                : "CASH",

        reference:
            data.reference
                ? String(
                    data.reference
                ).trim()
                : null,

        notes:
            data.notes
                ? String(
                    data.notes
                ).trim()
                : null,

        createdAt:
            new Date(),

        updatedAt:
            new Date()

    };


    const result =
        await transactions.insertOne(
            transaction
        );


    const transactionId =
        result.insertedId;


    // ------------------------------------------
    // APPLY CANONICAL STOCK MOVEMENTS
    // ------------------------------------------

    for (
        const item
        of transactionItems
    ) {

        await createStockMovement({

            productId:
                item.productId.toString(),

            batchId:
                item.batchId.toString(),

            type:
                "SALE",

            // Stock is always consumed in the product's canonical base unit.
            quantity:
                item.baseQuantity,

            reference:
                transaction.reference ||
                transactionId.toString(),

            notes:
                `Automatic stock movement from transaction (${item.quantity} ${item.uom}).`

        });
    }


    return {

        ...transaction,

        _id:
            transactionId

    };
}


// ==========================================
// GET TRANSACTION BY ID
// ==========================================

export async function getTransactionById(
    transactionId
) {

    if (
        !ObjectId.isValid(
            transactionId
        )
    ) {

        const error =
            new Error(
                "Invalid transaction ID."
            );

        error.statusCode = 400;

        throw error;
    }


    const transactions =
        getCollection(
            COLLECTIONS.TRANSACTIONS
        );


    return transactions.findOne({

        _id:
            new ObjectId(
                transactionId
            )

    });
}


// ==========================================
// LIST TRANSACTIONS
// ==========================================

export async function listTransactions(
    options = {}
) {

    const transactions =
        getCollection(
            COLLECTIONS.TRANSACTIONS
        );


    const limit =
        Math.min(
            Math.max(
                Number(
                    options.limit
                ) || 50,
                1
            ),
            100
        );


    const skip =
        Math.max(
            Number(
                options.skip
            ) || 0,
            0
        );


    return transactions
        .find({})
        .sort({
            createdAt:
                -1
        })
        .skip(skip)
        .limit(limit)
        .toArray();
}
