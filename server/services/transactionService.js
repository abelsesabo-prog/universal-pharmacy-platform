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

    const items =
        Array.isArray(data.items)
            ? data.items
            : [];

    if (items.length === 0) {
        const error = new Error(
            "Transaction must contain at least one item."
        );

        error.statusCode = 400;
        throw error;
    }

    const transactionItems = [];
    let totalAmount = 0;

    for (const item of items) {
        if (!ObjectId.isValid(item.productId)) {
            const error = new Error(
                "Invalid product ID in transaction item."
            );

            error.statusCode = 400;
            throw error;
        }

        if (!ObjectId.isValid(item.batchId)) {
            const error = new Error(
                "Invalid batch ID in transaction item."
            );

            error.statusCode = 400;
            throw error;
        }

        const product =
            await products.findOne({
                _id: new ObjectId(item.productId)
            });

        if (!product) {
            const error = new Error(
                "Product not found for transaction item."
            );

            error.statusCode = 404;
            throw error;
        }

        const sale =
            calculateUomSale(
                product,
                item.quantity,
                item.uom,
                item.unitPrice
            );

        totalAmount += sale.lineTotal;

        transactionItems.push({
            productId:
                new ObjectId(item.productId),

            batchId:
                new ObjectId(item.batchId),

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
    }

    const transaction = {
        type: "SALE",
        items: transactionItems,
        totalAmount,
        paymentMethod:
            data.paymentMethod
                ? String(data.paymentMethod).trim()
                : "CASH",
        reference:
            data.reference
                ? String(data.reference).trim()
                : null,
        notes:
            data.notes
                ? String(data.notes).trim()
                : null,
        createdAt: new Date(),
        updatedAt: new Date()
    };

    const result =
        await transactions.insertOne(
            transaction
        );

    const transactionId =
        result.insertedId;

    for (const item of transactionItems) {
        await createStockMovement({
            productId:
                item.productId.toString(),

            batchId:
                item.batchId.toString(),

            type:
                "SALE",

            // Inventory is authoritative in the product's canonical base unit.
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
        _id: transactionId
    };
}


// ==========================================
// GET TRANSACTION BY ID
// ==========================================

export async function getTransactionById(
    transactionId
) {

    if (!ObjectId.isValid(transactionId)) {
        const error = new Error(
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
            new ObjectId(transactionId)
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
                Number(options.limit) || 50,
                1
            ),
            100
        );

    const skip =
        Math.max(
            Number(options.skip) || 0,
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