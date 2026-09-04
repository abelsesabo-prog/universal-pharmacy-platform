import assert from "node:assert/strict";
import test from "node:test";

import {
    calculateUomSale,
    normalizeUomMatrix,
    resolveUom,
    validateUomConfiguration
} from "../shared/uom.js";

const product = {
    baseUnit: "piece",
    uomMatrix: [
        { unit: "piece", conversionToBase: 1, sellingPrice: 250 },
        { unit: "pair", conversionToBase: 2, sellingPrice: 500 },
        { unit: "box", conversionToBase: 100, sellingPrice: 10000 },
        { unit: "disabled", conversionToBase: 10, sellingPrice: 900, enabled: false }
    ]
};

test("validates a complete UOM matrix and base-unit invariant", () => {
    const result = validateUomConfiguration(product.baseUnit, product.uomMatrix);
    assert.equal(result.valid, true);
    assert.equal(result.baseUnit, "piece");
    assert.equal(result.uomMatrix.length, 4);
});

test("rejects a UOM matrix whose base unit is not conversion factor 1", () => {
    const result = validateUomConfiguration("piece", [
        { unit: "piece", conversionToBase: 2 },
        { unit: "box", conversionToBase: 100 }
    ]);
    assert.equal(result.valid, false);
    assert.ok(result.errors.some(error => error.includes("baseUnit conversionToBase must equal 1")));
});

test("rejects duplicate and non-positive UOM entries", () => {
    const result = validateUomConfiguration("piece", [
        { unit: "piece", conversionToBase: 1 },
        { unit: "piece", conversionToBase: 1 },
        { unit: "box", conversionToBase: 0 }
    ]);
    assert.equal(result.valid, false);
    assert.ok(result.errors.some(error => error.includes("Duplicate UOM entry")));
    assert.ok(result.errors.some(error => error.includes("must be greater than zero")));
});

test("normalizes object-form UOM maps", () => {
    const matrix = normalizeUomMatrix({
        piece: 1,
        pair: { conversionToBase: 2, sellingPrice: 500 },
        box: { conversion: 100, price: 10000 }
    });
    assert.equal(matrix.find(entry => entry.unit === "box").conversionToBase, 100);
    assert.equal(matrix.find(entry => entry.unit === "box").sellingPrice, 10000);
});

test("calculates sale quantity, base consumption, price and total", () => {
    const sale = calculateUomSale(product, 3, "pair");
    assert.deepEqual(sale, {
        unit: "pair",
        quantity: 3,
        conversionToBase: 2,
        baseQuantity: 6,
        unitPrice: 500,
        lineTotal: 1500
    });
});

test("uses configured UOM price and rejects an override", () => {
    assert.equal(calculateUomSale(product, 1, "box").unitPrice, 10000);
    assert.throws(
        () => calculateUomSale(product, 1, "box", 9999),
        error => error.statusCode === 400 && error.message.includes("must match its configured sellingPrice")
    );
});

test("blocks disabled and unknown selling units", () => {
    assert.throws(
        () => resolveUom(product, "disabled"),
        error => error.statusCode === 400 && error.message.includes("is not configured")
    );
    assert.throws(
        () => resolveUom(product, "carton"),
        error => error.statusCode === 400 && error.message.includes("is not configured")
    );
});

test("supports legacy products without an explicit UOM matrix", () => {
    const sale = calculateUomSale({ baseUnit: null, uomMatrix: null }, 2, "piece", 300);
    assert.equal(sale.unit, "piece");
    assert.equal(sale.conversionToBase, 1);
    assert.equal(sale.baseQuantity, 2);
    assert.equal(sale.unitPrice, 300);
    assert.equal(sale.lineTotal, 600);
});
