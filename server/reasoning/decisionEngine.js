// Explainable decision contracts used by domain organs.
// This layer decides from evidence; it does not own product, batch or financial state.

export const DECISION_TYPES = Object.freeze({
    PRODUCT_RESOLUTION: "PRODUCT_RESOLUTION"
});

export function decideProductResolution({ existingProduct, identityKey, tenantId }) {
    if (!tenantId) return { type: DECISION_TYPES.PRODUCT_RESOLUTION, action: "REJECT", reason: "TENANT_CONTEXT_REQUIRED" };
    if (existingProduct) {
        return {
            type: DECISION_TYPES.PRODUCT_RESOLUTION,
            action: "REUSE",
            reason: "CANONICAL_IDENTITY_MATCH",
            identityKey,
            productId: String(existingProduct._id)
        };
    }
    return {
        type: DECISION_TYPES.PRODUCT_RESOLUTION,
        action: "CREATE",
        reason: "NO_CANONICAL_IDENTITY_MATCH",
        identityKey
    };
}
