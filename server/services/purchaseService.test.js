import test from "node:test";
import assert from "node:assert/strict";
import { receivePurchase } from "./purchaseService.js";

const valid = {
    tenantId: "test-tenant",
    branchId: "main",
    invoiceNumber: "SUP-001",
    paymentMethod: "CREDIT",
    idempotencyKey: "purchase-test-001",
    items: [{ productId: "507f1f77bcf86cd799439011", batchNumber: "B001", quantity: 10, conversionToBase: 1, unitCost: "1250.00", expiryDate: "2099-01-01", uom: "piece" }]
};

test("purchase receipt requires tenant-scoped idempotency", async () => {
    await assert.rejects(() => receivePurchase({ ...valid, idempotencyKey: "" }), /idempotency key is required/i);
});

test("purchase receipt requires supplier invoice number", async () => {
    await assert.rejects(() => receivePurchase({ ...valid, invoiceNumber: "" }), /invoice number is required/i);
});

test("purchase receipt rejects invalid money before database mutation", async () => {
    await assert.rejects(() => receivePurchase({ ...valid, items: [{ ...valid.items[0], unitCost: "12.345" }] }), /exact decimal/i);
});

test("purchase receipt rejects fractional stock quantity", async () => {
    await assert.rejects(() => receivePurchase({ ...valid, items: [{ ...valid.items[0], quantity: 1.5 }] }), /positive whole number/i);
});

test("purchase receipt rejects expired inventory before database mutation", async () => {
    await assert.rejects(() => receivePurchase({ ...valid, items: [{ ...valid.items[0], expiryDate: "2000-01-01" }] }), /already expired/i);
});

test("purchase receipt rejects manufactured date after expiry date before database mutation", async () => {
    await assert.rejects(() => receivePurchase({ ...valid, items: [{ ...valid.items[0], manufacturedDate: "2099-02-01" }] }), /manufactured date cannot be after expiry date/i);
});

test("purchase receipt accepts a valid manufactured date before expiry", async () => {
    await assert.rejects(() => receivePurchase({ ...valid, items: [{ ...valid.items[0], manufacturedDate: "2098-01-01" }] }), /Product not found in this tenant/i);
});

test("purchase receipt rejects unsupported payment method before database mutation", async () => {
    await assert.rejects(() => receivePurchase({ ...valid, paymentMethod: "CRYPTO" }), /unsupported purchase payment method/i);
});
