import assert from "node:assert/strict";
import test from "node:test";
import { COLLECTIONS, RETURN_SCHEMA, RETURN_ITEM_SCHEMA, SCHEMA_VERSION } from "../shared/schemas/index.js";
import { createSaleReturn } from "../server/services/returnService.js";

test("sale return schema is registered and versioned", () => {
    assert.equal(SCHEMA_VERSION, 14);
    assert.equal(COLLECTIONS.RETURNS, "returns");
    assert.equal(COLLECTIONS.RETURN_ITEMS, "return_items");
    assert.deepEqual(RETURN_SCHEMA.required, ["tenantId", "branchId", "saleId", "refundPaymentMethod", "refund", "status", "reason", "idempotencyKey", "createdAt"]);
    assert.ok(RETURN_ITEM_SCHEMA.required.includes("baseQuantity"));
});

test("sale return rejects missing tenant before database access", async () => {
    await assert.rejects(() => createSaleReturn({ branchId: "main", saleId: "507f1f77bcf86cd799439011", items: [{ productId: "507f1f77bcf86cd799439012", quantity: 1 }], refundPaymentMethod: "CASH", idempotencyKey: "r-1" }), /Tenant context is required/);
});

test("sale return rejects missing idempotency key before database access", async () => {
    await assert.rejects(() => createSaleReturn({ tenantId: "demo-pharmacy", branchId: "main", saleId: "507f1f77bcf86cd799439011", items: [{ productId: "507f1f77bcf86cd799439012", quantity: 1 }], refundPaymentMethod: "CASH" }), /idempotency key is required/);
});

test("sale return rejects invalid sale id before database access", async () => {
    await assert.rejects(() => createSaleReturn({ tenantId: "demo-pharmacy", branchId: "main", saleId: "bad", items: [{ productId: "507f1f77bcf86cd799439012", quantity: 1 }], refundPaymentMethod: "CASH", idempotencyKey: "r-2" }), /Invalid sale ID/);
});

test("sale return rejects empty item sets before database access", async () => {
    await assert.rejects(() => createSaleReturn({ tenantId: "demo-pharmacy", branchId: "main", saleId: "507f1f77bcf86cd799439011", items: [], refundPaymentMethod: "CASH", idempotencyKey: "r-3" }), /At least one return item/);
});
