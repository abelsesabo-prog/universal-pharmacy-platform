import { ObjectId } from "mongodb";
import { getCollection } from "./index.js";
import { COLLECTIONS } from "../../shared/schemas/index.js";

const SENSITIVE_SCOPES = new Set(["SALE_VOID", "REFUND", "DISCOUNT_OVERRIDE", "EXPENSE_APPROVAL", "QUARANTINE_DISPOSITION", "FINANCIAL_POSTING", "USER_ADMIN", "TENANT_ADMIN"]);
const STATUSES = new Set(["ACTIVE", "REVOKED", "EXPIRED"]);

function fail(message, statusCode = 400) { const error = new Error(message); error.statusCode = statusCode; throw error; }
function text(value) { return String(value ?? "").trim(); }
function asDate(value, label) { const date = new Date(value); if (Number.isNaN(date.getTime())) fail(`Invalid ${label}.`); return date; }

export function validateDelegation(input = {}) {
    const tenantId = text(input.tenantId);
    if (!tenantId) fail("Tenant context is required.", 403);
    const delegatorId = text(input.delegatorId);
    const delegateeId = text(input.delegateeId);
    if (!delegatorId || !delegateeId) fail("Delegator and delegatee are required.");
    if (delegatorId === delegateeId) fail("Delegator and delegatee must be different.");
    const scope = text(input.scope).toUpperCase();
    if (!SENSITIVE_SCOPES.has(scope)) fail(`Unsupported delegation scope: ${scope || "empty"}.`);
    const startsAt = asDate(input.startsAt, "startsAt");
    const expiresAt = asDate(input.expiresAt, "expiresAt");
    if (expiresAt <= startsAt) fail("Delegation expiry must be after its start.");
    const valueCap = input.valueCap == null ? null : Number(input.valueCap);
    if (valueCap != null && (!Number.isFinite(valueCap) || valueCap <= 0)) fail("Delegation valueCap must be greater than zero.");
    return { tenantId, delegatorId, delegateeId, scope, status: "ACTIVE", startsAt, expiresAt, valueCap, reason: text(input.reason) || null, reviewRequired: input.reviewRequired !== false, createdAt: new Date() };
}

export async function createDelegation(input) {
    const delegation = validateDelegation(input);
    const result = await getCollection(COLLECTIONS.DELEGATIONS).insertOne(delegation);
    return { ...delegation, _id: result.insertedId };
}

export async function revokeDelegation({ tenantId, delegationId, actorId, reason } = {}) {
    if (!text(tenantId) || !text(actorId)) fail("Tenant context and actor are required.", 403);
    if (!ObjectId.isValid(delegationId)) fail("Invalid delegation ID.");
    const now = new Date();
    const result = await getCollection(COLLECTIONS.DELEGATIONS).findOneAndUpdate(
        { _id: new ObjectId(delegationId), tenantId: text(tenantId), status: "ACTIVE" },
        { $set: { status: "REVOKED", revokedAt: now, revokedBy: text(actorId), revokeReason: text(reason) || null } },
        { returnDocument: "after" }
    );
    if (!result.value) fail("Active delegation not found.", 404);
    return result.value;
}

export async function authorizeDelegatedAction({ tenantId, actorId, scope, value = 0, at = new Date() } = {}) {
    const id = text(tenantId); const actor = text(actorId); const requestedScope = text(scope).toUpperCase();
    if (!id || !actor) fail("Tenant context and actor are required.", 403);
    if (!SENSITIVE_SCOPES.has(requestedScope)) fail(`Unsupported sensitive scope: ${requestedScope || "empty"}.`);
    const when = at instanceof Date ? at : asDate(at, "action time");
    const numericValue = Number(value || 0);
    if (!Number.isFinite(numericValue) || numericValue < 0) fail("Action value must be zero or greater.");

    const candidates = await getCollection(COLLECTIONS.DELEGATIONS).find({ tenantId: id, delegateeId: actor, scope: requestedScope, status: "ACTIVE", startsAt: { $lte: when }, expiresAt: { $gt: when } }).sort({ createdAt: -1 }).toArray();
    for (const delegation of candidates) {
        if (delegation.valueCap != null && numericValue > Number(delegation.valueCap)) continue;
        return { authorized: true, delegated: true, delegationId: delegation._id, delegatorId: delegation.delegatorId, reviewRequired: delegation.reviewRequired !== false };
    }
    return { authorized: false, delegated: false, reason: "No active delegation covers this action." };
}

export { SENSITIVE_SCOPES, STATUSES };
