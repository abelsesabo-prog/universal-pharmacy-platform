import { getCollection } from "./index.js";
import { COLLECTIONS } from "../../shared/schemas/index.js";

const STATES = ["PROVISIONED", "ACTIVE", "SUSPENDED", "ARCHIVED"];
const ROLES = ["cashier", "clerk", "pharmacist", "manager", "compliance_officer", "system_admin"];

function fail(message, statusCode = 400) { const error = new Error(message); error.statusCode = statusCode; throw error; }
function text(value) { return String(value ?? "").trim(); }
function requireTenant(tenantId) { const id = text(tenantId); if (!id) fail("Tenant context is required.", 403); return id; }

export function validateTenant(input = {}) {
    const tenantId = requireTenant(input.tenantId);
    const status = text(input.status || "PROVISIONED").toUpperCase();
    if (!STATES.includes(status)) fail(`Invalid tenant lifecycle state: ${status}.`);
    return { tenantId, name: text(input.name), status, parentTenantId: text(input.parentTenantId) || null, currency: text(input.currency || "TZS"), taxProfile: input.taxProfile || null, paymentChannels: Array.isArray(input.paymentChannels) ? input.paymentChannels.map(text).filter(Boolean) : [], featureFlags: input.featureFlags && typeof input.featureFlags === "object" ? { ...input.featureFlags } : {}, createdAt: input.createdAt ? new Date(input.createdAt) : new Date(), updatedAt: new Date() };
}

export async function provisionTenant(input) {
    const tenant = validateTenant(input);
    if (!tenant.name) fail("Tenant name is required.");
    const collection = getCollection(COLLECTIONS.TENANTS);
    const existing = await collection.findOne({ tenantId: tenant.tenantId });
    if (existing) fail("Tenant already exists.", 409);
    const result = await collection.insertOne(tenant);
    return { ...tenant, _id: result.insertedId };
}

export async function transitionTenant({ tenantId, status, actorId, reason } = {}) {
    const id = requireTenant(tenantId); const next = text(status).toUpperCase();
    if (!STATES.includes(next)) fail(`Invalid tenant lifecycle state: ${next}.`);
    if (!text(actorId)) fail("Actor is required.", 403);
    const now = new Date();
    const result = await getCollection(COLLECTIONS.TENANTS).findOneAndUpdate({ tenantId: id }, { $set: { status: next, updatedAt: now }, $push: { lifecycleHistory: { status: next, actorId: text(actorId), reason: text(reason) || null, at: now } } }, { returnDocument: "after" });
    if (!result.value) fail("Tenant not found.", 404);
    return result.value;
}

export function validateRole(role) { const normalized = text(role).toLowerCase(); if (!ROLES.includes(normalized)) fail(`Unsupported role: ${normalized || "empty"}.`); return normalized; }

export async function listTenantUsers({ tenantId, role } = {}) {
    const id = requireTenant(tenantId); const filter = { tenantId: id }; if (role) filter.role = validateRole(role);
    return getCollection(COLLECTIONS.USERS).find(filter, { projection: { passwordHash: 0 } }).toArray();
}

export async function exportTenantSnapshot({ tenantId } = {}) {
    const id = requireTenant(tenantId);
    const names = Object.values(COLLECTIONS);
    const snapshot = {};
    for (const name of names) snapshot[name] = await getCollection(name).find({ tenantId: id }).toArray();
    return { schemaVersion: 9, tenantId: id, exportedAt: new Date().toISOString(), collections: snapshot };
}
