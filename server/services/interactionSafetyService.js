// Clinical safety organ: evaluates supplied, authoritative interaction/allergy facts
// against canonical product ingredients. This service does not invent clinical rules.

function text(value) { return String(value ?? "").trim(); }
function fail(message, statusCode = 400) { const error = new Error(message); error.statusCode = statusCode; throw error; }

function normalizeSubstances(values) {
    if (!Array.isArray(values)) return [];
    return [...new Set(values.map(text).filter(Boolean).map(value => value.toLowerCase()))];
}

export function validateInteractionSafetyRequest(input = {}) {
    const errors = [];
    if (!text(input.tenantId)) errors.push("tenantId is required.");
    if (!text(input.productId)) errors.push("productId is required.");
    if (!Array.isArray(input.ingredients) || !input.ingredients.length) errors.push("ingredients must be a non-empty array.");
    if (input.patientAllergies !== undefined && !Array.isArray(input.patientAllergies)) errors.push("patientAllergies must be an array.");
    if (input.interactions !== undefined && !Array.isArray(input.interactions)) errors.push("interactions must be an array.");
    return { valid: errors.length === 0, errors };
}

export function evaluateInteractionSafety(input = {}) {
    const validation = validateInteractionSafetyRequest(input);
    if (!validation.valid) fail(validation.errors.join(" "));

    const ingredients = normalizeSubstances(input.ingredients);
    const allergies = normalizeSubstances(input.patientAllergies || []);
    const allergySet = new Set(allergies);

    const allergyMatches = ingredients
        .filter(ingredient => allergySet.has(ingredient))
        .map(substance => ({ type: "ALLERGY", substance, severity: "UNSPECIFIED" }));

    const interactions = Array.isArray(input.interactions) ? input.interactions : [];
    const interactionFindings = interactions
        .filter(rule => rule && typeof rule === "object")
        .filter(rule => {
            const involved = normalizeSubstances(rule.substances);
            return involved.length > 0 && involved.every(substance => ingredients.includes(substance));
        })
        .map(rule => ({
            type: "INTERACTION",
            ruleId: text(rule.ruleId),
            severity: text(rule.severity) || "UNSPECIFIED",
            substances: normalizeSubstances(rule.substances),
            source: text(rule.source)
        }));

    return {
        safeToProceed: allergyMatches.length === 0 && interactionFindings.length === 0,
        requiresReview: allergyMatches.length > 0 || interactionFindings.length > 0,
        findings: [...allergyMatches, ...interactionFindings]
    };
}

export { normalizeSubstances };
