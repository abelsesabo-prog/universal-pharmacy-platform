import crypto from "node:crypto";
import { ObjectId } from "mongodb";
import { getCollection } from "./index.js";
import { COLLECTIONS } from "../../shared/schemas/index.js";

function fail(message, statusCode = 400) { const e = new Error(message); e.statusCode = statusCode; throw e; }
function text(v) { return String(v ?? "").trim(); }
function positive(v, name) { const n = Number(v); if (!Number.isFinite(n) || n <= 0) fail(`${name} must be greater than zero.`); return n; }
function oid(v, name) { const s = text(v); if (!ObjectId.isValid(s)) fail(`${name} is invalid.`); return new ObjectId(s); }
function date(v, name = "date") { const d = v ? new Date(v) : new Date(); if (Number.isNaN(d.getTime())) fail(`Invalid ${name}.`); return d; }

export function validateEligibility(input = {}) {
    const scheme = text(input.scheme).toUpperCase(); const memberId = text(input.memberId); const tenantId = text(input.tenantId);
    if (!tenantId) fail("Tenant context is required.", 403); if (!scheme || !memberId) fail("Insurance scheme and memberId are required.");
    return { tenantId, scheme, memberId, patientId: text(input.patientId) || null, status: text(input.status).toUpperCase() || "PENDING", checkedAt: date(input.checkedAt, "checkedAt"), expiresAt: input.expiresAt ? date(input.expiresAt, "expiresAt") : null, responseReference: text(input.responseReference) || null, evidence: input.evidence ?? null };
}
export async function recordEligibility(input) { const entry = validateEligibility(input); const r = await getCollection(COLLECTIONS.INSURANCE_ELIGIBILITY).insertOne(entry); return { ...entry, _id: r.insertedId }; }

export function validatePreauthorization(input = {}) {
    const tenantId = text(input.tenantId); if (!tenantId) fail("Tenant context is required.", 403);
    const scheme = text(input.scheme).toUpperCase(); const memberId = text(input.memberId); if (!scheme || !memberId) fail("Insurance scheme and memberId are required.");
    return { tenantId, scheme, memberId, patientId: text(input.patientId) || null, requestedAmount: positive(input.requestedAmount, "requestedAmount"), status: text(input.status).toUpperCase() || "PENDING", authorizationId: text(input.authorizationId) || null, expiresAt: input.expiresAt ? date(input.expiresAt, "expiresAt") : null, evidence: input.evidence ?? null, createdAt: date(input.createdAt, "createdAt") };
}
export async function createPreauthorization(input) { const entry = validatePreauthorization(input); const r = await getCollection(COLLECTIONS.INSURANCE_PREAUTHORIZATIONS).insertOne(entry); return { ...entry, _id: r.insertedId }; }

export function validateClaimBatch(input = {}) {
    const tenantId = text(input.tenantId); const scheme = text(input.scheme).toUpperCase(); const claims = Array.isArray(input.claims) ? input.claims : [];
    if (!tenantId) fail("Tenant context is required.", 403); if (!scheme || !claims.length) fail("Insurance scheme and at least one claim are required.");
    const normalized = claims.map((c, i) => { const claimId = text(c.claimId) || `claim-${i + 1}`; const amount = positive(c.amount, `claims[${i}].amount`); return { claimId, amount, saleId: text(c.saleId) || null, memberId: text(c.memberId) || null, patientId: text(c.patientId) || null, authorizationId: text(c.authorizationId) || null }; });
    return { tenantId, scheme, claims: normalized, status: text(input.status).toUpperCase() || "READY", submissionReference: text(input.submissionReference) || null, submittedAt: input.submittedAt ? date(input.submittedAt, "submittedAt") : null, response: input.response ?? null, createdAt: date(input.createdAt, "createdAt") };
}
export async function createClaimBatch(input) { const entry = validateClaimBatch(input); const r = await getCollection(COLLECTIONS.INSURANCE_CLAIM_BATCHES).insertOne(entry); return { ...entry, _id: r.insertedId, claimCount: entry.claims.length }; }

export async function expiryWatch({ tenantId, days = 90, branchId } = {}) {
    const id = text(tenantId); if (!id) fail("Tenant context is required.", 403); const horizon = new Date(Date.now() + Math.max(1, Number(days) || 90) * 86400000);
    const filter = { tenantId: id, expiryDate: { $lte: horizon }, quantity: { $gt: 0 } }; if (text(branchId)) filter.branchId = text(branchId);
    return getCollection(COLLECTIONS.BATCHES).find(filter).sort({ expiryDate: 1 }).limit(500).toArray();
}

export async function createRelocationPlan(input) {
    const tenantId = text(input.tenantId); if (!tenantId) fail("Tenant context is required.", 403);
    const batchId = oid(input.batchId, "batchId"); const fromBranchId = text(input.fromBranchId); const toBranchId = text(input.toBranchId); const quantity = positive(input.quantity, "quantity");
    if (!fromBranchId || !toBranchId || fromBranchId === toBranchId) fail("Distinct source and destination branches are required.");
    const batch = await getCollection(COLLECTIONS.BATCHES).findOne({ _id: batchId, tenantId }); if (!batch) fail("Batch not found.", 404);
    if (text(batch.branchId) !== fromBranchId) fail("Batch is not held by the source branch."); if (Number(batch.quantity) < quantity) fail("Insufficient batch quantity for relocation.");
    const plan = { tenantId, batchId, fromBranchId, toBranchId, quantity, status: "PLANNED", reason: text(input.reason) || "EXPIRY_RELOCATION", executeBy: input.executeBy ? date(input.executeBy, "executeBy") : null, createdAt: new Date() };
    const r = await getCollection(COLLECTIONS.EXPIRY_RELOCATION_PLANS).insertOne(plan); return { ...plan, _id: r.insertedId };
}

export async function executeRelocation({ tenantId, planId, actorId } = {}) {
    const id = text(tenantId); if (!id) fail("Tenant context is required.", 403); const pid = oid(planId, "planId");
    const plans = getCollection(COLLECTIONS.EXPIRY_RELOCATION_PLANS); const plan = await plans.findOne({ _id: pid, tenantId: id }); if (!plan) fail("Relocation plan not found.", 404); if (plan.status !== "PLANNED") fail("Relocation plan is not executable in its current state.");
    const batch = await getCollection(COLLECTIONS.BATCHES).findOne({ _id: plan.batchId, tenantId: id }); if (!batch) fail("Batch not found.", 404);
    if (text(batch.branchId) !== plan.fromBranchId) fail("Batch source branch no longer matches the plan.");
    const quantity = Number(plan.quantity); const updated = await getCollection(COLLECTIONS.BATCHES).updateOne({ _id: plan.batchId, tenantId: id, branchId: plan.fromBranchId, quantity: { $gte: quantity } }, { $inc: { quantity: -quantity } });
    if (updated.modifiedCount !== 1) fail("Batch changed before relocation could be completed.", 409);
    const clone = { ...batch, _id: undefined, branchId: plan.toBranchId, quantity, relocationFromBatchId: plan.batchId.toString(), createdAt: new Date(), updatedAt: new Date() }; delete clone._id;
    const inserted = await getCollection(COLLECTIONS.BATCHES).insertOne(clone);
    const movementBase = { tenantId: id, productId: batch.productId, batchId: plan.batchId, reference: `RELOCATION:${plan._id}`, notes: plan.reason, createdBy: text(actorId) || null, createdAt: new Date() };
    const out = await getCollection(COLLECTIONS.STOCK_MOVEMENTS).insertOne({ ...movementBase, branchId: plan.fromBranchId, type: "TRANSFER_OUT", quantity, direction: "OUT" });
    const into = await getCollection(COLLECTIONS.STOCK_MOVEMENTS).insertOne({ ...movementBase, batchId: inserted.insertedId, branchId: plan.toBranchId, type: "TRANSFER_IN", quantity, direction: "IN" });
    await plans.updateOne({ _id: pid, tenantId: id }, { $set: { status: "EXECUTED", executedAt: new Date(), movementIds: [out.insertedId, into.insertedId], destinationBatchId: inserted.insertedId } });
    return { success: true, planId: pid, destinationBatchId: inserted.insertedId, movementIds: [out.insertedId, into.insertedId] };
}

export async function submitEfd({ tenantId, provider, idempotencyKey, saleId, request } = {}) {
    const id = text(tenantId); const key = text(idempotencyKey); const vendor = text(provider); if (!id) fail("Tenant context is required.", 403); if (!vendor || !key) fail("EFD provider and idempotencyKey are required.");
    const docs = getCollection(COLLECTIONS.EFD_DOCUMENTS); const existing = await docs.findOne({ tenantId: id, provider: vendor, idempotencyKey: key }); if (existing) return { ...existing, replayed: true };
    const document = { tenantId: id, provider: vendor, idempotencyKey: key, saleId: text(saleId) || null, status: "QUEUED", request: request ?? null, createdAt: new Date() };
    const r = await docs.insertOne(document); return { ...document, _id: r.insertedId, replayed: false, adapter: "PROVIDER_NEUTRAL" };
}

export async function createDelegation(input) {
    const tenantId = text(input.tenantId); const delegatorId = text(input.delegatorId); const delegateeId = text(input.delegateeId); const scope = Array.isArray(input.scope) ? input.scope.map(text).filter(Boolean) : [];
    if (!tenantId) fail("Tenant context is required.", 403); if (!delegatorId || !delegateeId || !scope.length) fail("Delegator, delegatee and scope are required.");
    const startsAt = date(input.startsAt, "startsAt"); const expiresAt = date(input.expiresAt, "expiresAt"); if (expiresAt <= startsAt) fail("Delegation expiry must be after its start.");
    const entry = { tenantId, delegatorId, delegateeId, scope, valueCap: input.valueCap == null ? null : positive(input.valueCap, "valueCap"), status: "ACTIVE", startsAt, expiresAt, reason: text(input.reason) || null, reviewRequired: input.reviewRequired !== false, createdAt: new Date() };
    const r = await getCollection(COLLECTIONS.DELEGATIONS).insertOne(entry); return { ...entry, _id: r.insertedId };
}

export async function revokeDelegation({ tenantId, delegationId } = {}) { const id = text(tenantId); const did = oid(delegationId, "delegationId"); const r = await getCollection(COLLECTIONS.DELEGATIONS).updateOne({ _id: did, tenantId: id, status: "ACTIVE" }, { $set: { status: "REVOKED", revokedAt: new Date() } }); if (r.matchedCount !== 1) fail("Active delegation not found.", 404); return { success: true, delegationId: did }; }

export function idempotencyFingerprint(value) { return crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex"); }
