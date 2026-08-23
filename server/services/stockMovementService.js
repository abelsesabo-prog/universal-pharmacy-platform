// ==========================================
// Universal Pharmacy Platform
// Stock Movement Service
// ==========================================

import { ObjectId } from "mongodb";

import {
    COLLECTIONS,
    STOCK_MOVEMENT_TYPES
} from "../../shared/schemas/index.js";

import { getCollection } from "./index.js";


// ==========================================
// STOCK MOVEMENT DIRECTIONS
// ==========================================

const STOCK_IN_TYPES = [
    "PURCHASE",
    "RETURN",
    "TRANSFER_IN"
];

const STOCK_OUT_TYPES = [
    "SALE",
    "TRANSFER_OUT",
    "DAMAGE",
    "EXPIRED"
];


// ==========================================
// NORMALIZE MOVEMENT
// ==========================================

function normalizeMovement(data) {

    return {
        productId:
            new ObjectId(
                data.productId
            ),

        batchId:
            new ObjectId(
                data.batchId
            ),

        type:
            String(
                data.type || ""
            )
                .trim()
                .toUpperCase(),

        quantity:
            Number(
                data.quantity
            ),

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
            new Date()
    };
}


// ==========================================
// CREATE STOCK MOVEMENT
// ==========================================

export async function createStockMovement(
    data
) {

    // --------------------------------------
    // VALIDATE PRODUCT ID
    // --------------------------------------

    if (
        !ObjectId.isValid(
            data.productId
        )
    ) {

        const error =
            new Error(
                "Invalid product ID."
            );

        error.statusCode = 400;

        throw error;
    }


    // --------------------------------------
    // BATCH ID IS REQUIRED
    // --------------------------------------

    if (
        !data.batchId
    ) {

        const error =
            new Error(
                "A batch ID is required for stock movements."
            );

        error.statusCode = 400;

        throw error;
    }


    if (
        !ObjectId.isValid(
            data.batchId
        )
    ) {

        const error =
            new Error(
                "Invalid batch ID."
            );

        error.statusCode = 400;

        throw error;
    }


    // --------------------------------------
    // VALIDATE MOVEMENT TYPE
    // --------------------------------------

    const type =
        String(
            data.type || ""
        )
            .trim()
            .toUpperCase();


    if (
        !STOCK_MOVEMENT_TYPES.includes(
            type
        )
    ) {

        const error =
            new Error(
                `Invalid stock movement type. Allowed types: ${STOCK_MOVEMENT_TYPES.join(", ")}`
            );

        error.statusCode = 400;

        throw error;
    }


    // --------------------------------------
    // ADJUSTMENT IS NOT YET AUTOMATIC
    // --------------------------------------

    if (
        type === "ADJUSTMENT"
    ) {

        const error =
            new Error(
                "ADJUSTMENT movements require controlled adjustment logic and are not yet supported."
            );

        error.statusCode = 400;

        throw error;
    }


    // --------------------------------------
    // VALIDATE QUANTITY
    // --------------------------------------

    const quantity =
        Number(
            data.quantity
        );


    if (
        !Number.isFinite(
            quantity
        ) ||
        quantity <= 0
    ) {

        const error =
            new Error(
                "Movement quantity must be greater than zero."
            );

        error.statusCode = 400;

        throw error;
    }


    // --------------------------------------
    // COLLECTIONS
    // --------------------------------------

    const movements =
        getCollection(
            COLLECTIONS.STOCK_MOVEMENTS
        );

    const batches =
        getCollection(
            COLLECTIONS.BATCHES
        );


    const productObjectId =
        new ObjectId(
            data.productId
        );

    const batchObjectId =
        new ObjectId(
            data.batchId
        );


    // --------------------------------------
    // FIND BATCH
    // --------------------------------------

    const batch =
        await batches.findOne({
            _id:
                batchObjectId
        });


    if (
        !batch
    ) {

        const error =
            new Error(
                "Batch not found."
            );

        error.statusCode = 404;

        throw error;
    }


    // --------------------------------------
    // VERIFY BATCH BELONGS TO PRODUCT
    // --------------------------------------

    if (
        batch.productId.toString() !==
        productObjectId.toString()
    ) {

        const error =
            new Error(
                "The selected batch does not belong to the selected product."
            );

        error.statusCode = 400;

        throw error;
    }


    // --------------------------------------
    // CALCULATE STOCK DIRECTION
    // --------------------------------------

    let quantityChange = 0;


    if (
        STOCK_IN_TYPES.includes(
            type
        )
    ) {

        quantityChange =
            quantity;
    }


    if (
        STOCK_OUT_TYPES.includes(
            type
        )
    ) {

        quantityChange =
            -quantity;
    }


    // --------------------------------------
    // PREVENT NEGATIVE STOCK
    // --------------------------------------

    const currentQuantity =
        Number(
            batch.quantity || 0
        );


    const newQuantity =
        currentQuantity +
        quantityChange;


    if (
        newQuantity < 0
    ) {

        const error =
            new Error(
                `Insufficient stock. Current batch quantity is ${currentQuantity}.`
            );

        error.statusCode = 400;

        throw error;
    }


    // --------------------------------------
    // UPDATE BATCH QUANTITY
    // --------------------------------------

    const updateResult =
        await batches.updateOne(
            {
                _id:
                    batchObjectId,

                quantity:
                    currentQuantity
            },
            {
                $set: {
                    quantity:
                        newQuantity,

                    updatedAt:
                        new Date()
                }
            }
        );


    if (
        updateResult.modifiedCount !== 1
    ) {

        const error =
            new Error(
                "Stock quantity changed before this movement could be processed. Please try again."
            );

        error.statusCode = 409;

        throw error;
    }


    // --------------------------------------
    // CREATE MOVEMENT RECORD
    // --------------------------------------

    const movement =
        normalizeMovement({
            ...data,
            type,
            quantity
        });


    const result =
        await movements.insertOne(
            movement
        );


    // --------------------------------------
    // RETURN SAVED MOVEMENT
    // --------------------------------------

    return {
        ...movement,
        _id:
            result.insertedId,

        previousQuantity:
            currentQuantity,

        newQuantity:
            newQuantity,

        quantityChange:
            quantityChange
    };
}


// ==========================================
// GET STOCK MOVEMENT BY ID
// ==========================================

export async function getStockMovementById(
    movementId
) {

    const movements =
        getCollection(
            COLLECTIONS.STOCK_MOVEMENTS
        );


    if (
        !ObjectId.isValid(
            movementId
        )
    ) {

        const error =
            new Error(
                "Invalid stock movement ID."
            );

        error.statusCode = 400;

        throw error;
    }


    return movements.findOne({
        _id:
            new ObjectId(
                movementId
            )
    });
}


// ==========================================
// LIST STOCK MOVEMENTS
// ==========================================

export async function listStockMovements(
    options = {}
) {

    const movements =
        getCollection(
            COLLECTIONS.STOCK_MOVEMENTS
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


    const filter = {};


    // --------------------------------------
    // FILTER BY PRODUCT
    // --------------------------------------

    if (
        options.productId
    ) {

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


        filter.productId =
            new ObjectId(
                options.productId
            );
    }


    // --------------------------------------
    // FILTER BY BATCH
    // --------------------------------------

    if (
        options.batchId
    ) {

        if (
            !ObjectId.isValid(
                options.batchId
            )
        ) {

            const error =
                new Error(
                    "Invalid batch ID."
                );

            error.statusCode = 400;

            throw error;
        }


        filter.batchId =
            new ObjectId(
                options.batchId
            );
    }


    // --------------------------------------
    // FILTER BY TYPE
    // --------------------------------------

    if (
        options.type
    ) {

        const type =
            String(
                options.type
            )
                .trim()
                .toUpperCase();


        if (
            !STOCK_MOVEMENT_TYPES.includes(
                type
            )
        ) {

            const error =
                new Error(
                    "Invalid stock movement type."
                );

            error.statusCode = 400;

            throw error;
        }


        filter.type =
            type;
    }


    // --------------------------------------
    // RETURN MOVEMENTS
    // --------------------------------------

    return movements
        .find(
            filter
        )
        .sort({
            createdAt:
                -1
        })
        .skip(
            skip
        )
        .limit(
            limit
        )
        .toArray();
}