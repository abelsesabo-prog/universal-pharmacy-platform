// ==========================================
// Universal Pharmacy Platform
// Runtime Diagnostic Probes
// ==========================================

import {
    PROBE_SAFETY
} from "./runtimeProbeRunner.js";


// ==========================================
// Test Context Helpers
// ==========================================

function createProbeReference(
    prefix
) {

    return `${prefix}-${Date.now()}-${
        Math.random()
            .toString(36)
            .slice(2, 8)
            .toUpperCase()
    }`;
}


function createProbeBatchNumber() {

    return createProbeReference(
        "DIAGNOSTIC-BATCH"
    );
}


// ==========================================
// Response Helpers
// ==========================================

function responseContains(
    response,
    text
) {

    const source =
        JSON.stringify(
            response.body || {}
        ).toLowerCase();


    return source.includes(
        String(text).toLowerCase()
    );
}


function createPassedResult(
    evidence,
    details
) {

    return {
        status:
            "PASSED",

        verified:
            true,

        evidence,

        details
    };
}


function createFailedResult(
    evidence,
    details
) {

    return {
        status:
            "FAILED",

        verified:
            true,

        evidence,

        details
    };
}


// ==========================================
// Controlled Stock Context
// ==========================================

async function createControlledStockContext(
    {
        baseUrl,
        safeFetch
    }
) {

    const productReference =
        createProbeReference(
            "DIAGNOSTIC-PRODUCT"
        );


    const productResponse =
        await safeFetch(
            `${baseUrl}/api/products`,
            {
                method:
                    "POST",

                headers: {
                    "Content-Type":
                        "application/json"
                },

                body:
                    JSON.stringify({
                        brandName:
                            productReference,

                        genericName:
                            productReference,

                        dosageForm:
                            "Tablet",

                        category:
                            "Diagnostic"
                    })
            }
        );


    if (
        !productResponse.ok ||
        !productResponse.body?.product?._id
    ) {

        throw new Error(
            `Diagnostic product creation failed: ${
                productResponse.status
            } ${
                JSON.stringify(
                    productResponse.body
                )
            }`
        );
    }


    const productId =
        productResponse
            .body
            .product
            ._id;


    const batchResponse =
        await safeFetch(
            `${baseUrl}/api/batches`,
            {
                method:
                    "POST",

                headers: {
                    "Content-Type":
                        "application/json"
                },

                body:
                    JSON.stringify({
                        productId,

                        batchNumber:
                            createProbeBatchNumber(),

                        quantity:
                            5,

                        expiryDate:
                            "2035-12-31",

                        costPrice:
                            100,

                        sellingPrice:
                            150,

                        location:
                            "DIAGNOSTIC"
                    })
            }
        );


    if (
        !batchResponse.ok ||
        !batchResponse.body?.batch?._id
    ) {

        throw new Error(
            `Diagnostic batch creation failed: ${
                batchResponse.status
            } ${
                JSON.stringify(
                    batchResponse.body
                )
            }`
        );
    }


    return {
        productId,

        batchId:
            batchResponse
                .body
                .batch
                ._id,

        quantity:
            5,

        productResponse,

        batchResponse
    };
}


// ==========================================
// Oversale Rejection Probe
// ==========================================

const oversaleRejectedProbe = {

    capabilityId:
        "inventory.stock-protection.oversale",

    assertion:
        "oversale-rejected",

    safety:
        PROBE_SAFETY.CONTROLLED,

    async execute(
        context
    ) {

        const {
            baseUrl,
            safeFetch
        } = context;


        const stockContext =
            await createControlledStockContext(
                context
            );


        const requestedQuantity =
            stockContext.quantity + 1;


        const response =
            await safeFetch(
                `${baseUrl}/api/stock-movements`,
                {
                    method:
                        "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify({
                            productId:
                                stockContext.productId,

                            batchId:
                                stockContext.batchId,

                            type:
                                "SALE",

                            quantity:
                                requestedQuantity,

                            reference:
                                createProbeReference(
                                    "OVERSALE-PROBE"
                                ),

                            notes:
                                "Diagnostic oversale protection probe."
                        })
                }
            );


        const rejected =
            response.status >= 400;


        const mentionsInsufficientStock =
            responseContains(
                response,
                "insufficient stock"
            );


        if (
            rejected &&
            mentionsInsufficientStock
        ) {

            return createPassedResult(
                {
                    productId:
                        stockContext.productId,

                    batchId:
                        stockContext.batchId,

                    availableQuantity:
                        stockContext.quantity,

                    requestedQuantity,

                    httpStatus:
                        response.status,

                    response:
                        response.body
                },

                "Oversale request against a real controlled batch was rejected."
            );
        }


        return createFailedResult(
            {
                productId:
                    stockContext.productId,

                batchId:
                    stockContext.batchId,

                availableQuantity:
                    stockContext.quantity,

                requestedQuantity,

                httpStatus:
                    response.status,

                response:
                    response.body
            },

            "Oversale protection was not conclusively demonstrated."
        );
    }
};


// ==========================================
// Negative Stock Prevention Probe
// ==========================================

const negativeStockPreventedProbe = {

    capabilityId:
        "inventory.stock-protection.oversale",

    assertion:
        "negative-stock-prevented",

    safety:
        PROBE_SAFETY.CONTROLLED,

    async execute(
        context
    ) {

        const {
            baseUrl,
            safeFetch
        } = context;


        const stockContext =
            await createControlledStockContext(
                context
            );


        const requestedQuantity =
            stockContext.quantity + 100;


        const response =
            await safeFetch(
                `${baseUrl}/api/stock-movements`,
                {
                    method:
                        "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify({
                            productId:
                                stockContext.productId,

                            batchId:
                                stockContext.batchId,

                            type:
                                "SALE",

                            quantity:
                                requestedQuantity,

                            reference:
                                createProbeReference(
                                    "NEGATIVE-STOCK-PROBE"
                                ),

                            notes:
                                "Diagnostic negative stock prevention probe."
                        })
                }
            );


        const rejected =
            response.status >= 400;


        const mentionsInsufficient =
            responseContains(
                response,
                "insufficient stock"
            );


        if (
            rejected &&
            mentionsInsufficient
        ) {

            return createPassedResult(
                {
                    productId:
                        stockContext.productId,

                    batchId:
                        stockContext.batchId,

                    availableQuantity:
                        stockContext.quantity,

                    requestedQuantity,

                    httpStatus:
                        response.status,

                    response:
                        response.body
                },

                "Runtime system prevented stock from becoming negative."
            );
        }


        return createFailedResult(
            {
                productId:
                    stockContext.productId,

                batchId:
                    stockContext.batchId,

                availableQuantity:
                    stockContext.quantity,

                requestedQuantity,

                httpStatus:
                    response.status,

                response:
                    response.body
            },

            "Negative stock prevention was not conclusively demonstrated."
        );
    }
};


// ==========================================
// Negative Quantity Rejection Probe
// ==========================================

const negativeQuantityRejectedProbe = {

    capabilityId:
        "inventory.stock-protection.quantity",

    assertion:
        "negative-quantity-rejected",

    safety:
        PROBE_SAFETY.CONTROLLED,

    async execute(
        {
            baseUrl,
            safeFetch
        }
    ) {

        const response =
            await safeFetch(
                `${baseUrl}/api/stock-movements`,
                {
                    method:
                        "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify({
                            productId:
                                "000000000000000000000000",

                            batchId:
                                "000000000000000000000000",

                            type:
                                "SALE",

                            quantity:
                                -1,

                            reference:
                                createProbeReference(
                                    "NEGATIVE-QUANTITY-PROBE"
                                ),

                            notes:
                                "Diagnostic negative quantity probe."
                        })
                }
            );


        const rejected =
            response.status >= 400;


        const mentionsQuantity =
            responseContains(
                response,
                "quantity"
            );


        if (
            rejected &&
            mentionsQuantity
        ) {

            return createPassedResult(
                {
                    httpStatus:
                        response.status,

                    response:
                        response.body
                },

                "Negative movement quantity was rejected."
            );
        }


        return createFailedResult(
            {
                httpStatus:
                    response.status,

                response:
                    response.body
            },

            "Negative quantity rejection was not conclusively demonstrated."
        );
    }
};


// ==========================================
// Zero Quantity Rejection Probe
// ==========================================

const zeroQuantityRejectedProbe = {

    capabilityId:
        "inventory.stock-protection.quantity",

    assertion:
        "zero-quantity-rejected",

    safety:
        PROBE_SAFETY.CONTROLLED,

    async execute(
        {
            baseUrl,
            safeFetch
        }
    ) {

        const response =
            await safeFetch(
                `${baseUrl}/api/stock-movements`,
                {
                    method:
                        "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify({
                            productId:
                                "000000000000000000000000",

                            batchId:
                                "000000000000000000000000",

                            type:
                                "SALE",

                            quantity:
                                0,

                            reference:
                                createProbeReference(
                                    "ZERO-QUANTITY-PROBE"
                                ),

                            notes:
                                "Diagnostic zero quantity probe."
                        })
                }
            );


        const rejected =
            response.status >= 400;


        const mentionsQuantity =
            responseContains(
                response,
                "quantity"
            );


        if (
            rejected &&
            mentionsQuantity
        ) {

            return createPassedResult(
                {
                    httpStatus:
                        response.status,

                    response:
                        response.body
                },

                "Zero movement quantity was rejected."
            );
        }


        return createFailedResult(
            {
                httpStatus:
                    response.status,

                response:
                    response.body
            },

            "Zero quantity rejection was not conclusively demonstrated."
        );
    }
};


// ==========================================
// Invalid Product ID Rejection Probe
// ==========================================

const invalidProductIdRejectedProbe = {

    capabilityId:
        "batch.product-linkage",

    assertion:
        "invalid-product-id-rejected",

    safety:
        PROBE_SAFETY.CONTROLLED,

    async execute(
        {
            baseUrl,
            safeFetch
        }
    ) {

        const response =
            await safeFetch(
                `${baseUrl}/api/batches`,
                {
                    method:
                        "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify({
                            productId:
                                "INVALID-PRODUCT-ID",

                            batchNumber:
                                createProbeBatchNumber(),

                            quantity:
                                5,

                            expiryDate:
                                "2035-12-31",

                            costPrice:
                                100,

                            sellingPrice:
                                150,

                            location:
                                "DIAGNOSTIC"
                        })
                }
            );


        const rejected =
            response.status === 400;


        const mentionsInvalidProductId =
            responseContains(
                response,
                "invalid product id"
            );


        if (
            rejected &&
            mentionsInvalidProductId
        ) {

            return createPassedResult(
                {
                    httpStatus:
                        response.status,

                    response:
                        response.body
                },

                "Invalid product ID was rejected before batch creation."
            );
        }


        return createFailedResult(
            {
                httpStatus:
                    response.status,

                response:
                    response.body
            },

            "Invalid product ID rejection was not conclusively demonstrated."
        );
    }
};


// ==========================================
// Missing Product Rejection Probe
// ==========================================

const missingProductRejectedProbe = {

    capabilityId:
        "batch.product-linkage",

    assertion:
        "missing-product-rejected",

    safety:
        PROBE_SAFETY.CONTROLLED,

    async execute(
        {
            baseUrl,
            safeFetch
        }
    ) {

        const missingProductId =
            "000000000000000000000000";


        const response =
            await safeFetch(
                `${baseUrl}/api/batches`,
                {
                    method:
                        "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify({
                            productId:
                                missingProductId,

                            batchNumber:
                                createProbeBatchNumber(),

                            quantity:
                                5,

                            expiryDate:
                                "2035-12-31",

                            costPrice:
                                100,

                            sellingPrice:
                                150,

                            location:
                                "DIAGNOSTIC"
                        })
                }
            );


        const rejected =
            response.status === 404;


        const mentionsProductNotFound =
            responseContains(
                response,
                "product not found"
            );


        if (
            rejected &&
            mentionsProductNotFound
        ) {

            return createPassedResult(
                {
                    productId:
                        missingProductId,

                    httpStatus:
                        response.status,

                    response:
                        response.body
                },

                "Batch creation was rejected when the referenced product did not exist."
            );
        }


        return createFailedResult(
            {
                productId:
                    missingProductId,

                httpStatus:
                    response.status,

                response:
                    response.body
            },

            "Missing product rejection was not conclusively demonstrated."
        );
    }
};


// ==========================================
// Product-Batch Integrity Probe
// ==========================================

const productBatchIntegrityProbe = {

    capabilityId:
        "batch.product-linkage",

    assertion:
        "product-batch-integrity-enforced",

    safety:
        PROBE_SAFETY.CONTROLLED,

    async execute(
        context
    ) {

        const {
            baseUrl,
            safeFetch
        } = context;


        const productReference =
            createProbeReference(
                "DIAGNOSTIC-INTEGRITY-PRODUCT"
            );


        const productResponse =
            await safeFetch(
                `${baseUrl}/api/products`,
                {
                    method:
                        "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify({
                            brandName:
                                productReference,

                            genericName:
                                productReference,

                            dosageForm:
                                "Tablet",

                            category:
                                "Diagnostic"
                        })
                }
            );


        if (
            !productResponse.ok ||
            !productResponse.body?.product?._id
        ) {

            return createFailedResult(
                {
                    httpStatus:
                        productResponse.status,

                    response:
                        productResponse.body
                },

                "Controlled product could not be created for product-batch integrity verification."
            );
        }


        const productId =
            productResponse
                .body
                .product
                ._id;


        const batchNumber =
            createProbeBatchNumber();


        const createResponse =
            await safeFetch(
                `${baseUrl}/api/batches`,
                {
                    method:
                        "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify({
                            productId,

                            batchNumber,

                            quantity:
                                5,

                            expiryDate:
                                "2035-12-31",

                            costPrice:
                                100,

                            sellingPrice:
                                150,

                            location:
                                "DIAGNOSTIC-INTEGRITY"
                        })
                }
            );


        if (
            !createResponse.ok ||
            !createResponse.body?.batch?._id
        ) {

            return createFailedResult(
                {
                    productId,

                    httpStatus:
                        createResponse.status,

                    response:
                        createResponse.body
                },

                "Controlled batch could not be created for product-batch integrity verification."
            );
        }


        const createdBatch =
            createResponse
                .body
                .batch;


        const storedProductId =
            String(
                createdBatch.productId
            );


        const linkageMatches =
            storedProductId ===
            String(productId);


        if (
            linkageMatches
        ) {

            return createPassedResult(
                {
                    productId,

                    batchId:
                        createdBatch._id,

                    storedProductId,

                    batchNumber,

                    httpStatus:
                        createResponse.status,

                    response:
                        createResponse.body
                },

                "Created batch preserved the exact product linkage."
            );
        }


        return createFailedResult(
            {
                expectedProductId:
                    productId,

                storedProductId,

                batchId:
                    createdBatch._id,

                httpStatus:
                    createResponse.status,

                response:
                    createResponse.body
            },

            "Created batch did not preserve the expected product linkage."
        );
    }
};


// ==========================================
// Controlled Stock Adjustment Probe
// ==========================================

const controlledAdjustmentProbe = {

    capabilityId:
        "inventory.stock-adjustment.controlled",

    assertion:
        "controlled-adjustment-directions-enforced",

    safety:
        PROBE_SAFETY.CONTROLLED,

    async execute(
        context
    ) {

        const {
            baseUrl,
            safeFetch
        } = context;


        // --------------------------------------
        // CREATE CONTROLLED STOCK
        // --------------------------------------

        const stockContext =
            await createControlledStockContext(
                context
            );


        const initialQuantity =
            stockContext.quantity;


        // --------------------------------------
        // INCREASE
        // --------------------------------------

        const increaseResponse =
            await safeFetch(
                `${baseUrl}/api/stock-movements`,
                {
                    method:
                        "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify({
                            productId:
                                stockContext.productId,

                            batchId:
                                stockContext.batchId,

                            type:
                                "ADJUSTMENT",

                            quantity:
                                2,

                            adjustmentDirection:
                                "INCREASE",

                            reference:
                                createProbeReference(
                                    "ADJUSTMENT-INCREASE-PROBE"
                                ),

                            notes:
                                "Diagnostic controlled adjustment increase probe."
                        })
                }
            );


        const increasePassed =
            increaseResponse.status === 201 &&
            increaseResponse.body?.success === true &&
            increaseResponse.body?.movement?.quantityChange === 2 &&
            increaseResponse.body?.movement?.previousQuantity ===
                initialQuantity &&
            increaseResponse.body?.movement?.newQuantity ===
                initialQuantity + 2;


        if (!increasePassed) {

            return createFailedResult(
                {
                    stage:
                        "INCREASE",

                    productId:
                        stockContext.productId,

                    batchId:
                        stockContext.batchId,

                    initialQuantity,

                    httpStatus:
                        increaseResponse.status,

                    response:
                        increaseResponse.body
                },

                "Controlled ADJUSTMENT INCREASE did not produce the expected stock change."
            );
        }


        // --------------------------------------
        // DECREASE
        // --------------------------------------

        const decreaseResponse =
            await safeFetch(
                `${baseUrl}/api/stock-movements`,
                {
                    method:
                        "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify({
                            productId:
                                stockContext.productId,

                            batchId:
                                stockContext.batchId,

                            type:
                                "ADJUSTMENT",

                            quantity:
                                2,

                            adjustmentDirection:
                                "DECREASE",

                            reference:
                                createProbeReference(
                                    "ADJUSTMENT-DECREASE-PROBE"
                                ),

                            notes:
                                "Diagnostic controlled adjustment decrease probe."
                        })
                }
            );


        const expectedAfterDecrease =
            initialQuantity;


        const decreasePassed =
            decreaseResponse.status === 201 &&
            decreaseResponse.body?.success === true &&
            decreaseResponse.body?.movement?.quantityChange === -2 &&
            decreaseResponse.body?.movement?.previousQuantity ===
                initialQuantity + 2 &&
            decreaseResponse.body?.movement?.newQuantity ===
                expectedAfterDecrease;


        if (!decreasePassed) {

            return createFailedResult(
                {
                    stage:
                        "DECREASE",

                    productId:
                        stockContext.productId,

                    batchId:
                        stockContext.batchId,

                    expectedQuantity:
                        expectedAfterDecrease,

                    httpStatus:
                        decreaseResponse.status,

                    response:
                        decreaseResponse.body
                },

                "Controlled ADJUSTMENT DECREASE did not produce the expected stock change."
            );
        }


        // --------------------------------------
        // INVALID DIRECTION
        // --------------------------------------

        const invalidResponse =
            await safeFetch(
                `${baseUrl}/api/stock-movements`,
                {
                    method:
                        "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify({
                            productId:
                                stockContext.productId,

                            batchId:
                                stockContext.batchId,

                            type:
                                "ADJUSTMENT",

                            quantity:
                                1,

                            adjustmentDirection:
                                "WRONG",

                            reference:
                                createProbeReference(
                                    "ADJUSTMENT-INVALID-PROBE"
                                ),

                            notes:
                                "Diagnostic invalid adjustment direction probe."
                        })
                }
            );


        const invalidRejected =
            invalidResponse.status >= 400 &&
            responseContains(
                invalidResponse,
                "ADJUSTMENT movements require adjustmentDirection"
            );


        if (!invalidRejected) {

            return createFailedResult(
                {
                    stage:
                        "INVALID-DIRECTION",

                    productId:
                        stockContext.productId,

                    batchId:
                        stockContext.batchId,

                    httpStatus:
                        invalidResponse.status,

                    response:
                        invalidResponse.body
                },

                "Invalid ADJUSTMENT direction was not rejected."
            );
        }


        // --------------------------------------
        // OVERDRAW DECREASE
        // --------------------------------------

        const overdrawQuantity =
            expectedAfterDecrease + 1;


        const overdrawResponse =
            await safeFetch(
                `${baseUrl}/api/stock-movements`,
                {
                    method:
                        "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify({
                            productId:
                                stockContext.productId,

                            batchId:
                                stockContext.batchId,

                            type:
                                "ADJUSTMENT",

                            quantity:
                                overdrawQuantity,

                            adjustmentDirection:
                                "DECREASE",

                            reference:
                                createProbeReference(
                                    "ADJUSTMENT-OVERDRAW-PROBE"
                                ),

                            notes:
                                "Diagnostic insufficient stock adjustment probe."
                        })
                }
            );


        const overdrawRejected =
            overdrawResponse.status >= 400 &&
            responseContains(
                overdrawResponse,
                "insufficient stock"
            );


        if (!overdrawRejected) {

            return createFailedResult(
                {
                    stage:
                        "OVERDRAW",

                    productId:
                        stockContext.productId,

                    batchId:
                        stockContext.batchId,

                    availableQuantity:
                        expectedAfterDecrease,

                    requestedQuantity:
                        overdrawQuantity,

                    httpStatus:
                        overdrawResponse.status,

                    response:
                        overdrawResponse.body
                },

                "Insufficient-stock ADJUSTMENT DECREASE was not rejected."
            );
        }


        // --------------------------------------
        // FINAL CONTROLLED DECREASE
        // --------------------------------------
        // This confirms the rejected overdraw
        // did not mutate the stock quantity.

        const finalDecreaseResponse =
            await safeFetch(
                `${baseUrl}/api/stock-movements`,
                {
                    method:
                        "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify({
                            productId:
                                stockContext.productId,

                            batchId:
                                stockContext.batchId,

                            type:
                                "ADJUSTMENT",

                            quantity:
                                expectedAfterDecrease,

                            adjustmentDirection:
                                "DECREASE",

                            reference:
                                createProbeReference(
                                    "ADJUSTMENT-FINAL-DECREASE-PROBE"
                                ),

                            notes:
                                "Diagnostic final adjustment state verification."
                        })
                }
            );


        const finalPassed =
            finalDecreaseResponse.status === 201 &&
            finalDecreaseResponse.body?.success === true &&
            finalDecreaseResponse.body?.movement?.previousQuantity ===
                expectedAfterDecrease &&
            finalDecreaseResponse.body?.movement?.newQuantity ===
                0;


        if (!finalPassed) {

            return createFailedResult(
                {
                    stage:
                        "FINAL-STATE",

                    productId:
                        stockContext.productId,

                    batchId:
                        stockContext.batchId,

                    expectedPreviousQuantity:
                        expectedAfterDecrease,

                    expectedFinalQuantity:
                        0,

                    httpStatus:
                        finalDecreaseResponse.status,

                    response:
                        finalDecreaseResponse.body
                },

                "Final stock state did not prove that rejected adjustments left stock unchanged."
            );
        }


        // --------------------------------------
        // PASS
        // --------------------------------------

        return createPassedResult(
            {
                productId:
                    stockContext.productId,

                batchId:
                    stockContext.batchId,

                initialQuantity,

                increase:
                    increaseResponse.body?.movement,

                decrease:
                    decreaseResponse.body?.movement,

                invalidDirection:
                    invalidResponse.body,

                overdraw:
                    overdrawResponse.body,

                finalDecrease:
                    finalDecreaseResponse.body?.movement
            },

            "Controlled stock adjustments correctly enforce INCREASE and DECREASE directions, reject invalid directions, prevent insufficient-stock decreases, and preserve stock after rejected requests."
        );
    }
};

// ==========================================
// Runtime Probe Collection
// ==========================================

export const RUNTIME_PROBES = [

    invalidProductIdRejectedProbe,

    missingProductRejectedProbe,

    productBatchIntegrityProbe,

    oversaleRejectedProbe,

    negativeStockPreventedProbe,

    negativeQuantityRejectedProbe,

    zeroQuantityRejectedProbe,

    controlledAdjustmentProbe
];


// ==========================================
// Probe Selection
// ==========================================

export function getRuntimeProbes(
    capabilityId
) {

    if (!capabilityId) {
        return RUNTIME_PROBES;
    }


    return RUNTIME_PROBES.filter(
        probe =>
            probe.capabilityId ===
            capabilityId
    );
}


// ==========================================
// Default Export
// ==========================================

export default {

    RUNTIME_PROBES,

    getRuntimeProbes
};
