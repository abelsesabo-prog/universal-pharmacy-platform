import test from "node:test";
import assert from "node:assert/strict";
import { validateInvoiceChainRequest } from "../server/services/invoiceChainService.js";

test("invoice chain request requires tenant context and rows", () => {
    assert.deepEqual(validateInvoiceChainRequest({}), {
        valid: false,
        errors: ["tenantId is required.", "rows must be a non-empty array."]
    });
});

test("invoice chain request accepts a tenant with rows", () => {
    const result = validateInvoiceChainRequest({
        tenantId: "tenant-a",
        rows: [{ rowNumber: 1 }]
    });
    assert.equal(result.valid, true);
    assert.deepEqual(result.errors, []);
});
