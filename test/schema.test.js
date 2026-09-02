import test from "node:test";
import assert from "node:assert/strict";
import { COLLECTIONS, STOCK_MOVEMENT_TYPES, BATCH_SCHEMA, SALE_SCHEMA, SALE_ITEM_SCHEMA, SCHEMA_VERSION } from "../shared/schemas/index.js";

test("all planned core collections have canonical names", () => {
    for (const name of ["TENANTS", "USERS", "BRANCHES", "PRODUCTS", "BATCHES", "SALES", "SALE_ITEMS", "PURCHASES", "PURCHASE_ITEMS", "STOCK_MOVEMENTS", "CUSTOMERS", "SUPPLIERS", "EXPENSES", "AUDIT_LOGS"]) assert.equal(typeof COLLECTIONS[name], "string");
});

test("schema version is current and sale header matches sales service", () => {
    assert.equal(SCHEMA_VERSION, 4);
    assert.deepEqual(SALE_SCHEMA.required, ["tenantId", "branchId", "subtotal", "total", "payments", "status", "createdAt"]);
});

test("UOM-aware sale item contract records both selling and base quantities", () => {
    assert.deepEqual(SALE_ITEM_SCHEMA.required, ["tenantId", "saleId", "productId", "quantity", "unitPrice", "lineTotal", "uom", "conversionToBase", "baseQuantity", "createdAt"]);
});

test("stock movement types are finite and non-empty", () => {
    assert.ok(STOCK_MOVEMENT_TYPES.length >= 5);
    assert.ok(STOCK_MOVEMENT_TYPES.every(type => /^[A-Z_]+$/.test(type)));
});

test("batch contract requires tenant, product, batch number, quantity and expiry", () => {
    assert.deepEqual(BATCH_SCHEMA.required, ["tenantId", "productId", "batchNumber", "quantity", "expiryDate"]);
});