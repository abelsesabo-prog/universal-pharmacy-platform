import test from "node:test";
import assert from "node:assert/strict";
import { evaluateInteractionSafety, validateInteractionSafetyRequest } from "../server/services/interactionSafetyService.js";

test("interaction safety requires tenant, product and canonical ingredients", () => {
    const result = validateInteractionSafetyRequest({});
    assert.equal(result.valid, false);
    assert.ok(result.errors.some(error => /tenantId/i.test(error)));
    assert.ok(result.errors.some(error => /productId/i.test(error)));
    assert.ok(result.errors.some(error => /ingredients/i.test(error)));
});

test("allergy evidence blocks progression without inventing clinical rules", () => {
    const result = evaluateInteractionSafety({
        tenantId: "tenant-a",
        productId: "product-a",
        ingredients: ["amoxicillin", "clavulanic acid"],
        patientAllergies: ["AMOXICILLIN"]
    });
    assert.equal(result.safeToProceed, false);
    assert.equal(result.requiresReview, true);
    assert.equal(result.findings[0].type, "ALLERGY");
    assert.equal(result.findings[0].substance, "amoxicillin");
});

test("authoritative interaction rules are matched only when all supplied substances are present", () => {
    const result = evaluateInteractionSafety({
        tenantId: "tenant-a",
        productId: "product-a",
        ingredients: ["drug-a", "drug-b"],
        interactions: [
            { ruleId: "RULE-1", substances: ["DRUG-A", "drug-b"], severity: "HIGH", source: "authoritative-source" },
            { ruleId: "RULE-2", substances: ["drug-a", "drug-c"], severity: "HIGH", source: "authoritative-source" }
        ]
    });
    assert.equal(result.safeToProceed, false);
    assert.equal(result.findings.length, 1);
    assert.equal(result.findings[0].ruleId, "RULE-1");
    assert.equal(result.findings[0].source, "authoritative-source");
});

test("absence of supplied allergy or interaction evidence remains non-blocking", () => {
    const result = evaluateInteractionSafety({
        tenantId: "tenant-a",
        productId: "product-a",
        ingredients: ["drug-a"]
    });
    assert.equal(result.safeToProceed, true);
    assert.equal(result.requiresReview, false);
    assert.deepEqual(result.findings, []);
});
