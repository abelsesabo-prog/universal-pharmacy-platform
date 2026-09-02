export const OFFLINE_REPLAY_PHASES = Object.freeze([
    "VALIDATE",
    "RESOLVE",
    "APPLY",
    "AUDIT",
    "ACKNOWLEDGE"
]);

function text(value) {
    return String(value ?? "").trim();
}

export function validateReplayContract(event = {}) {
    const errors = [];
    if (!text(event?.tenantId)) errors.push("tenantId is required.");
    if (!text(event?.eventId)) errors.push("eventId is required.");
    if (!text(event?.eventType)) errors.push("eventType is required.");
    if (!event?.payload || typeof event.payload !== "object" || Array.isArray(event.payload)) {
        errors.push("payload must be an object.");
    }
    if (event?.status && event.status !== "PENDING") errors.push("Only PENDING events may enter replay.");

    if (event?.occurredAt !== undefined) {
        const occurredAt = new Date(event.occurredAt);
        if (Number.isNaN(occurredAt.getTime())) errors.push("occurredAt must be a valid timestamp.");
    }

    if (event?.eventType === "SALE" && event?.payload && typeof event.payload === "object" && !Array.isArray(event.payload)) {
        const payload = event.payload;
        if (!text(payload.productId)) errors.push("SALE replay requires productId.");
        const quantity = Number(payload.quantity);
        const baseQuantity = Number(payload.baseQuantity);
        const conversionToBase = Number(payload.conversionToBase ?? 1);
        if (!Number.isFinite(quantity) || quantity <= 0) errors.push("SALE replay quantity must be greater than zero.");
        if (!Number.isFinite(conversionToBase) || conversionToBase <= 0) errors.push("SALE replay conversionToBase must be greater than zero.");
        if (!Number.isFinite(baseQuantity) || baseQuantity <= 0) errors.push("SALE replay baseQuantity must be greater than zero.");
        if (Number.isFinite(quantity) && Number.isFinite(conversionToBase) && Number.isFinite(baseQuantity)) {
            const expectedBase = quantity * conversionToBase;
            if (Math.abs(expectedBase - baseQuantity) > 1e-9) errors.push("SALE replay baseQuantity does not match quantity × conversionToBase.");
        }

        const unitPrice = Number(payload.unitPrice ?? 0);
        const lineTotal = Number(payload.lineTotal ?? 0);
        if (!Number.isFinite(unitPrice) || unitPrice < 0) errors.push("SALE replay unitPrice must be a non-negative number.");
        if (!Number.isFinite(lineTotal) || lineTotal < 0) errors.push("SALE replay lineTotal must be a non-negative number.");
        if (Number.isFinite(quantity) && Number.isFinite(unitPrice) && Number.isFinite(lineTotal)) {
            const expectedTotal = quantity * unitPrice;
            if (Math.abs(expectedTotal - lineTotal) > 0.01) errors.push("SALE replay lineTotal does not match quantity × unitPrice.");
        }
        if (payload.payments !== undefined && !Array.isArray(payload.payments)) errors.push("SALE replay payments must be an array.");
    }

    return { valid: errors.length === 0, errors, nextPhase: errors.length ? null : "RESOLVE" };
}
