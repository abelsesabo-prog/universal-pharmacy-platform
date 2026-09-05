import test from "node:test";
import assert from "node:assert/strict";
import { extractVisualInvoice, visualInvoiceAvailable } from "../server/services/invoiceVisionService.js";

test("visual invoice extraction uses server-side Gemini vision and preserves invoice rows", async () => {
    const originalKey = process.env.GEMINI_API_KEY;
    const originalFetch = globalThis.fetch;
    process.env.GEMINI_API_KEY = "test-key";
    globalThis.fetch = async (url, options) => {
        assert.match(url, /gemini-3\.8-flash:generateContent/);
        assert.equal(options.method, "POST");
        const body = JSON.parse(options.body);
        assert.equal(body.contents[0].parts[1].inlineData.mimeType, "application/pdf");
        assert.ok(body.contents[0].parts[1].inlineData.data.length > 0);
        assert.equal(body.generationConfig.responseMimeType, "application/json");
        return new Response(JSON.stringify({
            candidates: [{ content: { parts: [{ text: JSON.stringify([
                { brandName: "EKELFIN TABS", genericName: "", dosageForm: "tablets", category: "Medicine", strength: "", strengthUnit: "", manufacturer: "", barcode: "", batchNumber: "4K38", quantity: 30, freeQuantity: 0, uom: "piece", conversionToBase: 1, expiryDate: "10/28", costPrice: 1900, sellingPrice: 0 }
            ]) }] } }]
        }), { status: 200, headers: { "content-type": "application/json" } });
    };
    try {
        assert.equal(visualInvoiceAvailable(), true);
        const rows = await extractVisualInvoice(Buffer.from("fake-pdf"), "supplier-invoice.pdf");
        assert.equal(rows.length, 1);
        assert.equal(rows[0].brandName, "EKELFIN TABS");
        assert.equal(rows[0].batchNumber, "4K38");
        assert.equal(rows[0].quantity, 30);
        assert.equal(rows[0]._extractionMethod, "visual-ai");
    } finally {
        globalThis.fetch = originalFetch;
        if (originalKey === undefined) delete process.env.GEMINI_API_KEY;
        else process.env.GEMINI_API_KEY = originalKey;
    }
});

test("visual invoice extraction rejects missing server API key", async () => {
    const originalKey = process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_API_KEY;
    try {
        assert.equal(visualInvoiceAvailable(), false);
        await assert.rejects(
            () => extractVisualInvoice(Buffer.from("fake"), "invoice.pdf"),
            error => error?.statusCode === 503 && /GEMINI_API_KEY/.test(error.message)
        );
    } finally {
        if (originalKey === undefined) delete process.env.GEMINI_API_KEY;
        else process.env.GEMINI_API_KEY = originalKey;
    }
});
