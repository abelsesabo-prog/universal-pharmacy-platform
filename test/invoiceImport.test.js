import test from "node:test";
import assert from "node:assert/strict";
import { previewInvoice } from "../server/services/invoiceImportService.js";

const csv = `Brand Name,Generic Name,Dosage Form,Strength,Batch Number,Quantity,UOM,Conversion to Base,Expiry Date,Cost Price,Selling Price\nPanadol,Paracetamol,Tablet,500 mg,B001,10,box,100,31/12/2027,12000,18000`;

test("invoice preview parses CSV and normalizes an inventory row", async () => {
    const result = await previewInvoice(Buffer.from(csv), "supplier-invoice.csv");
    assert.equal(result.rowCount, 1);
    assert.equal(result.validRowCount, 1);
    assert.equal(result.invalidRowCount, 0);
    assert.equal(result.readyToImport, true);
    assert.equal(result.rows[0].brandName, "Panadol");
    assert.equal(result.rows[0].genericName, "Paracetamol");
    assert.equal(result.rows[0].uom, "box");
    assert.equal(result.rows[0].conversionToBase, 100);
    assert.equal(result.rows[0].quantity, 10);
    assert.equal(result.rows[0].expiryDate, "2027-12-31");
});

test("invoice preview blocks incomplete stock rows", async () => {
    const result = await previewInvoice(Buffer.from("Brand,Generic,Quantity\nX,Y,0"), "bad.csv");
    assert.equal(result.rowCount, 1);
    assert.equal(result.readyToImport, false);
    assert.ok(result.rows[0].errors.includes("Batch number is required for inventory import."));
    assert.ok(result.rows[0].errors.includes("Quantity must be greater than zero."));
    assert.ok(result.rows[0].errors.includes("A valid expiry date is required."));
});

test("invoice preview rejects unsupported extensions", async () => {
    await assert.rejects(
        () => previewInvoice(Buffer.from("anything"), "invoice.exe"),
        error => error.statusCode === 415
    );
});
