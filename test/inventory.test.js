import test from "node:test";
import assert from "node:assert/strict";
import { createBatch, recordStockAdjustment } from "../server/services/inventoryService.js";

test("batch validation rejects missing tenant context", async () => {
    await assert.rejects(() => createBatch({ tenantId: "", productId: "507f1f77bcf86cd799439011", batchNumber: "B1", quantity: 10, expiryDate: "2099-01-01" }), error => error.statusCode === 403);
});

test("batch validation rejects invalid product id before database access", async () => {
    await assert.rejects(() => createBatch({ tenantId: "tenant-a", productId: "not-an-object-id", batchNumber: "B1", quantity: 10, expiryDate: "2099-01-01" }), error => error.statusCode === 400 && /product ID/i.test(error.message));
});

test("batch validation rejects expired stock", async () => {
    await assert.rejects(() => createBatch({ tenantId: "tenant-a", productId: "507f1f77bcf86cd799439011", batchNumber: "B1", quantity: 10, expiryDate: "2000-01-01" }), error => error.statusCode === 400 && /expired/i.test(error.message));
});

test("stock adjustment validates movement type and direction", async () => {
    await assert.rejects(() => recordStockAdjustment({ tenantId: "tenant-a", productId: "507f1f77bcf86cd799439011", type: "NOT_REAL", quantity: 1, direction: "IN" }), /Invalid stock movement type/);
    await assert.rejects(() => recordStockAdjustment({ tenantId: "tenant-a", productId: "507f1f77bcf86cd799439011", type: "ADJUSTMENT", quantity: 1, direction: "SIDEWAYS" }), /Direction must be IN or OUT/);
});
