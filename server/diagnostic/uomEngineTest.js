// ==========================================
// Universal Pharmacy Platform
// Universal UOM Engine Self-Test
// ==========================================

import assert from "node:assert/strict";

import {
    calculateUomSale,
    normalizeUomMatrix,
    validateUomConfiguration
} from "../../shared/uom.js";

const gloves = {
    baseUnit: "piece",
    uomMatrix: [
        { unit: "piece", conversionToBase: 1, sellingPrice: 250 },
        { unit: "pair", conversionToBase: 2, sellingPrice: 500 },
        { unit: "box", conversionToBase: 100, sellingPrice: 10000 }
    ]
};

const validConfiguration = validateUomConfiguration(gloves.baseUnit, gloves.uomMatrix);
assert.equal(validConfiguration.valid, true);

const onePiece = calculateUomSale(gloves, 1, "piece");
assert.deepEqual(onePiece, { unit: "piece", quantity: 1, conversionToBase: 1, baseQuantity: 1, unitPrice: 250, lineTotal: 250 });

const onePair = calculateUomSale(gloves, 1, "pair");
assert.equal(onePair.baseQuantity, 2);
assert.equal(onePair.unitPrice, 500);
assert.equal(onePair.lineTotal, 500);

const oneBox = calculateUomSale(gloves, 1, "box");
assert.equal(oneBox.baseQuantity, 100);
assert.equal(oneBox.unitPrice, 10000);
assert.equal(oneBox.lineTotal, 10000);

assert.throws(
    () => calculateUomSale(gloves, 1, "box", 25000),
    error => error.statusCode === 400 && error.message.includes("must match its configured sellingPrice")
);

assert.throws(
    () => calculateUomSale(gloves, 1, "carton"),
    error => error.statusCode === 400 && error.message.includes("is not configured")
);

const objectMap = normalizeUomMatrix({
    piece: 1,
    pair: { conversionToBase: 2, sellingPrice: 500 },
    box: { conversion: 100, price: 10000 }
});

assert.equal(objectMap.find(entry => entry.unit === "box").conversionToBase, 100);
assert.equal(objectMap.find(entry => entry.unit === "box").sellingPrice, 10000);

console.log("Universal UOM engine self-test: PASSED");