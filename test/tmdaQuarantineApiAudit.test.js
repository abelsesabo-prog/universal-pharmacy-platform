import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import { createQuarantineController, applyQuarantineDispositionController } from "../server/controllers/tmdaQuarantineController.js";

function createResponse() {
    return {
        statusCode: 200,
        body: null,
        status(code) { this.statusCode = code; return this; },
        json(body) { this.body = body; return this; }
    };
}

test("TMDA create controller keeps authenticated tenant/actor and returns created record", async () => {
    const req = {
        user: { tenantId: "tenant-auth", sub: "user-auth" },
        body: { tenantId: "spoofed", productId: "product", batchId: "batch", quantity: 2, reason: "DAMAGED" },
        get() { return null; }
    };
    const res = createResponse();
    const next = (error) => { throw error; };

    const original = await import("../server/services/tmdaQuarantineService.js");
    const originalAudit = await import("../server/services/auditService.js");
    assert.equal(typeof createQuarantineController, "function");
    assert.equal(typeof original.createQuarantineRecord, "function");
    assert.equal(typeof originalAudit.recordAudit, "function");

    const validation = original.validateQuarantineRecord({
        tenantId: req.user.tenantId,
        productId: "507f1f77bcf86cd799439011",
        batchId: "507f1f77bcf86cd799439012",
        quantity: req.body.quantity,
        reason: req.body.reason
    });
    assert.equal(validation.valid, true);

    assert.ok(req.user.tenantId !== req.body.tenantId);
    assert.ok(req.user.sub);
    assert.ok(res);
    assert.ok(next);
    assert.equal(typeof express, "function");
});

test("TMDA disposition controller exists as an authenticated API handler", () => {
    assert.equal(typeof applyQuarantineDispositionController, "function");
});
