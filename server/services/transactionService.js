// ==========================================
// Universal Pharmacy Platform
// Transaction Service
// ==========================================

import { ObjectId } from "mongodb";

import {
    COLLECTIONS
} from "../../shared/schemas/index.js";

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


    let totalAmount = 0;


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


        const quantity =
            Number(
                item.quantity
            );


        const unitPrice =
            Number(
                item.unitPrice
            );


        if (
            !Number.isFinite(
                quantity
            ) ||
            quantity <= 0
        ) {

            const error =
                new Error(
                    "Transaction item quantity must be greater than zero."
                );

            error.statusCode = 400;

            throw error;
        }


        if (
            !Number.isFinite(
                unitPrice
            ) ||
            unitPrice < 0
        ) {

            const error =
                new Error(
                    "Transaction item unit price must be valid."
                );

            error.statusCode = 400;

            throw error;
        }


        const lineTotal =
            quantity *
            unitPrice;


        totalAmount +=
            lineTotal;


        transactionItems.push({

            productId:
                new ObjectId(
                    item.productId
                ),

            batchId:
                new ObjectId(
                    item.batchId
                ),

            quantity,

            unitPrice,

            lineTotal

        });
    }


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

            quantity:
                item.quantity,

            reference:
                transaction.reference ||
                transactionId.toString(),

            notes:
                "Automatic stock movement from transaction."

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