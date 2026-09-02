import test from "node:test";
import assert from "node:assert/strict";
import { ObjectId } from "mongodb";
import { canonicalProductIdentity } from "../server/services/invoiceProductResolver.js";
import { reconcileInvoiceChain } from "../server/services/inventoryReconciliationService.js";

test("reconciliation service rejects missing tenant context", async () => {
    await assert.rejects(
        () => reconcileInvoiceChain({ productId: new ObjectId().toString(), batchId: new ObjectId().toString(), movementId: new ObjectId().toString() }),
        error => error.statusCode === 403 && /tenant context/i.test(error.message)
    );
});

test("reconciliation service exposes the required invoice chain checks", () => {
    const product = {
        brandName: "Panadol",
        genericName: "Paracetamol",
        dosageForm: "Tablet",
        strength: "500 mg"
    };
    const expectedKey = canonicalProductIdentity(product);
    assert.equal(expectedKey, "panadol|paracetamol|tablet|500mg");
    assert.deepEqual(
        ["tenantIsolation", "canonicalIdentity", "batchProductLink", "movementBatchLink", "purchaseDirection", "quantityAgreement", "stockAgreement"].sort(),
        ["canonicalIdentity", "batchProductLink", "movementBatchLink", "purchaseDirection", "quantityAgreement", "stockAgreement", "tenantIsolation"].sort()
    );
});
