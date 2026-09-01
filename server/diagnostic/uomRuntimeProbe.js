// ==========================================
// Universal Pharmacy Platform
// UOM End-to-End Runtime Probe
// ==========================================

import assert from "node:assert/strict";


const BASE_URL =
    process.env.UOM_PROBE_BASE_URL ||
    "http://localhost:10000";


async function request(
    path,
    options = {}
) {
    const response = await fetch(
        `${BASE_URL}${path}`,
        options
    );

    const body = await response.json();

    return {
        status: response.status,
        body
    };
}


async function main() {
    const reference =
        `UOM-RUNTIME-${Date.now()}`;

    const productResponse =
        await request(
            "/api/products",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    brandName: reference,
                    genericName: reference,
                    dosageForm: "Supply",
                    category: "Diagnostic",
                    baseUnit: "piece",
                    uomMatrix: [
                        {
                            unit: "piece",
                            conversionToBase: 1,
                            sellingPrice: 250
                        },
                        {
                            unit: "pair",
                            conversionToBase: 2,
                            sellingPrice: 500
                        },
                        {
                            unit: "box",
                            conversionToBase: 100,
                            sellingPrice: 10000
                        }
                    ]
                })
            }
        );

    assert.equal(
        productResponse.status,
        201
    );

    assert.equal(
        productResponse.body.success,
        true
    );

    const product =
        productResponse.body.product;

    assert.equal(
        product.baseUnit,
        "piece"
    );

    assert.equal(
        product.uomMatrix.length,
        3
    );


    const batchResponse =
        await request(
            "/api/batches",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    productId: product._id,
                    batchNumber:
                        `${reference}-BATCH`,
                    quantity: 105,
                    expiryDate: "2035-12-31",
                    costPrice: 60,
                    sellingPrice: 250,
                    location: "DIAGNOSTIC-UOM"
                })
            }
        );

    assert.equal(
        batchResponse.status,
        201
    );

    assert.equal(
        batchResponse.body.success,
        true
    );

    const batch =
        batchResponse.body.batch;


    const invalidPriceResponse =
        await request(
            "/api/transactions",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    items: [
                        {
                            productId: product._id,
                            batchId: batch._id,
                            uom: "box",
                            quantity: 1,
                            unitPrice: 25000
                        }
                    ],
                    paymentMethod: "CASH",
                    reference:
                        `${reference}-INVALID-PRICE`
                })
            }
        );

    assert.equal(
        invalidPriceResponse.status,
        400
    );

    assert.equal(
        invalidPriceResponse.body.success,
        false
    );

    assert.match(
        invalidPriceResponse.body.error,
        /must match its configured sellingPrice/
    );


    const saleResponse =
        await request(
            "/api/transactions",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    items: [
                        {
                            productId: product._id,
                            batchId: batch._id,
                            uom: "box",
                            quantity: 1
                        },
                        {
                            productId: product._id,
                            batchId: batch._id,
                            uom: "pair",
                            quantity: 1
                        },
                        {
                            productId: product._id,
                            batchId: batch._id,
                            uom: "piece",
                            quantity: 1
                        }
                    ],
                    paymentMethod: "CASH",
                    reference:
                        `${reference}-SALE`
                })
            }
        );

    assert.equal(
        saleResponse.status,
        201
    );

    assert.equal(
        saleResponse.body.success,
        true
    );

    const transaction =
        saleResponse.body.transaction;

    assert.equal(
        transaction.totalAmount,
        10750
    );

    assert.deepEqual(
        transaction.items.map(
            item => ({
                uom: item.uom,
                quantity: item.quantity,
                conversionToBase: item.conversionToBase,
                baseQuantity: item.baseQuantity,
                unitPrice: item.unitPrice,
                lineTotal: item.lineTotal
            })
        ),
        [
            {
                uom: "box",
                quantity: 1,
                conversionToBase: 100,
                baseQuantity: 100,
                unitPrice: 10000,
                lineTotal: 10000
            },
            {
                uom: "pair",
                quantity: 1,
                conversionToBase: 2,
                baseQuantity: 2,
                unitPrice: 500,
                lineTotal: 500
            },
            {
                uom: "piece",
                quantity: 1,
                conversionToBase: 1,
                baseQuantity: 1,
                unitPrice: 250,
                lineTotal: 250
            }
        ]
    );


    const finalBatchResponse =
        await request(
            `/api/batches/${batch._id}`
        );

    assert.equal(
        finalBatchResponse.status,
        200
    );

    assert.equal(
        finalBatchResponse.body.success,
        true
    );

    assert.equal(
        Number(finalBatchResponse.body.batch.quantity),
        2
    );


    console.log(
        JSON.stringify(
            {
                status: "PASSED",
                productId: product._id,
                batchId: batch._id,
                transactionId: transaction._id,
                sold: transaction.items,
                totalAmount: transaction.totalAmount,
                finalBaseQuantity:
                    finalBatchResponse.body.batch.quantity
            },
            null,
            2
        )
    );
}


main().catch(error => {
    console.error(
        JSON.stringify(
            {
                status: "FAILED",
                error: error.message
            },
            null,
            2
        )
    );

    process.exitCode = 1;
});
