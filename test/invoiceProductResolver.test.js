import test from "node:test";
import assert from "node:assert/strict";
import { canonicalProductText } from "../server/services/invoiceProductResolver.js";

test("canonical product text removes harmless formatting differences", () => {
    assert.equal(canonicalProductText("  Panadol®  Extra "), "panadol extra");
    assert.equal(canonicalProductText("Paracetamol-500 mg"), "paracetamol 500 mg");
    assert.equal(canonicalProductText("Amoxicillin / Clavulanate"), "amoxicillin clavulanate");
});
