import test from "node:test";
import assert from "node:assert/strict";
import { previewInvoice, MAX_INVOICE_ROWS, MAX_INVOICE_BYTES } from "./invoiceImportService.js";

test("invoice preview maps common supplier CSV headers", async () => {
    const csv = [
        "Brand Name,Generic Name,Dosage Form,Strength,Batch Number,Qty,UOM,Pack Size,Expiry Date,Cost Price,Selling Price",
        "Amoxil,Amoxicillin,Capsule,500 mg,B001,10,box,100,31/12/2027,25000,30000"
    ].join("\n");
    const result = await previewInvoice(Buffer.from(csv), "supplier.csv");
    assert.equal(result.rowCount, 1);
    assert.equal(result.validRowCount, 1);
    assert.equal(result.readyToImport, true);
    assert.equal(result.rows[0].brandName, "Amoxil");
    assert.equal(result.rows[0].genericName, "Amoxicillin");
    assert.equal(result.rows[0].quantity, 10);
    assert.equal(result.rows[0].uom, "box");
    assert.equal(result.rows[0].conversionToBase, 100);
    assert.equal(result.rows[0].expiryDate, "2027-12-31");
});

test("invoice preview rejects missing identity, batch, quantity and expiry", async () => {
    const csv = [
        "Brand,Generic,Qty,Batch,Expiry",
        ",,0,,not-a-date"
    ].join("\n");
    const result = await previewInvoice(Buffer.from(csv), "bad.csv");
    assert.equal(result.rowCount, 1);
    assert.equal(result.validRowCount, 0);
    assert.equal(result.readyToImport, false);
    assert.ok(result.rows[0].errors.length >= 4);
});

test("invoice preview rejects expired stock before inventory mutation", async () => {
    const csv = [
        "Brand,Generic,Qty,Batch,Expiry",
        "OldBrand,OldGeneric,5,B002,01/01/2020"
    ].join("\n");
    const result = await previewInvoice(Buffer.from(csv), "expired.csv");
    assert.equal(result.readyToImport, false);
    assert.ok(result.rows[0].errors.some(error => error.includes("expired")));
});

test("invoice preview enforces the row safety boundary", async () => {
    const rows = ["Brand,Generic,Qty,Batch,Expiry"];
    for (let i = 1; i <= MAX_INVOICE_ROWS + 1; i += 1) {
        rows.push(`Brand${i},Generic${i},1,B${i},31/12/2099`);
    }
    await assert.rejects(
        previewInvoice(Buffer.from(rows.join("\n")), "too-many.csv"),
        error => error.statusCode === 413 && error.message.includes(String(MAX_INVOICE_ROWS))
    );
});

test("invoice preview enforces the file-size safety boundary", async () => {
    const buffer = Buffer.alloc(MAX_INVOICE_BYTES + 1, 65);
    await assert.rejects(
        previewInvoice(buffer, "oversized.csv"),
        error => error.statusCode === 413 && error.message.includes("10 MB")
    );
});
