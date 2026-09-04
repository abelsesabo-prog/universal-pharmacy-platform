import test from "node:test";
import assert from "node:assert/strict";
import {
    canonicalProductIdentity,
    invoiceProductIdentity,
    canonicalProductText
} from "./invoiceProductResolver.js";

test("canonical product identity uses the master four identity dimensions", () => {
    const base = {
        brandName: "Panadol",
        genericName: "Paracetamol",
        manufacturer: "Example Pharma",
        dosageForm: "Tablet",
        strength: "500 mg",
        packSize: "100 tablets"
    };

    assert.equal(
        canonicalProductIdentity(base),
        "panadol|paracetamol|tablet|500mg"
    );
});

test("manufacturer is not a commercial identity dimension", () => {
    const base = {
        brandName: "Panadol",
        genericName: "Paracetamol",
        manufacturer: "Manufacturer A",
        dosageForm: "Tablet",
        strength: "500 mg",
        packSize: "100 tablets"
    };

    const variant = { ...base, manufacturer: "Manufacturer B" };
    assert.equal(canonicalProductIdentity(base), canonicalProductIdentity(variant));
});

test("pack size is not a commercial identity dimension", () => {
    const base = {
        brandName: "Panadol",
        genericName: "Paracetamol",
        manufacturer: "Example Pharma",
        dosageForm: "Tablet",
        strength: "500 mg",
        packSize: "100 tablets"
    };

    const variant = { ...base, packSize: "20 tablets" };
    assert.equal(canonicalProductIdentity(base), canonicalProductIdentity(variant));
});

test("formatting differences normalize to the same identity", () => {
    const a = {
        brandName: " Panadol ",
        genericName: "Paracetamol",
        manufacturer: "Example   Pharma",
        dosageForm: "Tablet",
        strength: "500 mg",
        packSize: "100 tablets"
    };
    const b = {
        brandName: "panadol",
        genericName: "paracetamol",
        manufacturer: "example pharma",
        dosageForm: "tablet",
        strength: "500MG",
        packSize: "100   tablets"
    };

    assert.equal(invoiceProductIdentity(a), invoiceProductIdentity(b));
    assert.equal(canonicalProductText("  Example   Pharma  "), "example pharma");
});

test("missing optional identity dimensions remain deterministic", () => {
    const identity = canonicalProductIdentity({
        brandName: "Item",
        genericName: "Generic",
        strength: null,
        manufacturer: null,
        dosageForm: null,
        packSize: null
    });

    assert.equal(identity, "item|generic|unspecified|");
});
