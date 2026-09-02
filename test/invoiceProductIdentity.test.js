import test from "node:test";
import assert from "node:assert/strict";
import { canonicalProductIdentity, invoiceProductIdentity } from "../server/services/invoiceProductResolver.js";

test("invoice identity ignores harmless product formatting differences", () => {
    const stored = {
        brandName: "Panadol Extra",
        genericName: "Paracetamol + Caffeine",
        dosageForm: "Tablet",
        strength: "500 mg / 65 mg"
    };
    const invoice = {
        brandName: "PANADOL-EXTRA",
        genericName: "Paracetamol + Caffeine",
        dosageForm: "tablet",
        strength: "500mg/65mg"
    };
    assert.equal(canonicalProductIdentity(stored), invoiceProductIdentity(invoice));
});

test("dosage form and strength remain part of product identity", () => {
    const tablet = { brandName: "Amoxil", genericName: "Amoxicillin", dosageForm: "Capsule", strength: "500 mg" };
    const syrup = { ...tablet, dosageForm: "Syrup" };
    const differentStrength = { ...tablet, strength: "250 mg" };
    assert.notEqual(canonicalProductIdentity(tablet), canonicalProductIdentity(syrup));
    assert.notEqual(canonicalProductIdentity(tablet), canonicalProductIdentity(differentStrength));
});

test("tenant is deliberately outside product identity", () => {
    const product = { brandName: "Amoxil", genericName: "Amoxicillin", dosageForm: "Capsule", strength: "500 mg" };
    assert.equal(canonicalProductIdentity({ ...product, tenantId: "TENANT-A" }), canonicalProductIdentity({ ...product, tenantId: "TENANT-B" }));
});
