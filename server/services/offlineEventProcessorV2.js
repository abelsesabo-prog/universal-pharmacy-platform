// Offline replay transaction helpers are introduced incrementally.
// This module provides the next safe replay contract without replacing the
// already verified offlineEventProcessor.js until its integration path is
// fully covered by database-backed tests.

export const OFFLINE_REPLAY_PHASES = Object.freeze([
    "VALIDATE",
    "RESOLVE",
    "APPLY",
    "AUDIT",
    "ACKNOWLEDGE"
]);

export function validateReplayContract(event = {}) {
    const errors = [];
    if (!event?.tenantId) errors.push("tenantId is required.");
    if (!event?.eventId) errors.push("eventId is required.");
    if (!event?.eventType) errors.push("eventType is required.");
    if (!event?.payload || typeof event.payload !== "object" || Array.isArray(event.payload)) errors.push("payload must be an object.");
    if (event?.status && event.status !== "PENDING") errors.push("Only PENDING events may enter replay.");
    return { valid: errors.length === 0, errors, nextPhase: errors.length ? null : "RESOLVE" };
}
