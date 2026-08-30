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
// Runtime Probe Collection
// ==========================================

export const RUNTIME_PROBES = [

    invalidProductIdRejectedProbe,

    missingProductRejectedProbe,

    productBatchIntegrityProbe,

    oversaleRejectedProbe,

    negativeStockPreventedProbe,

    negativeQuantityRejectedProbe,

    zeroQuantityRejectedProbe
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