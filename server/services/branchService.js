import { randomUUID } from "node:crypto";
import { getCollection } from "./index.js";
import { COLLECTIONS } from "../../shared/schemas/index.js";

function fail(message, statusCode = 400) { const error = new Error(message); error.statusCode = statusCode; throw error; }
function assertTenantId(tenantId) {
    const normalized = String(tenantId || "").trim();
    if (!normalized) fail("Tenant context is required.", 403);
    return normalized;
}

export async function ensureDefaultBranch(tenantId) {
    const scopedTenantId = assertTenantId(tenantId);
    const branches = getCollection(COLLECTIONS.BRANCHES);
    const existing = await branches.findOne({ tenantId: scopedTenantId, code: "MAIN", status: "active" });
    if (existing) return existing;
    const now = new Date();
    const branch = { branchId: randomUUID(), tenantId: scopedTenantId, code: "MAIN", name: "Main Branch", status: "active", createdAt: now, updatedAt: now };
    await branches.insertOne(branch);
    return branch;
}

export async function createBranch({ tenantId, code, name }) {
    const scopedTenantId = assertTenantId(tenantId);
    const normalizedCode = String(code || "").trim().toUpperCase();
    const normalizedName = String(name || "").trim();
    if (!normalizedCode || !normalizedName) fail("Branch code and name are required.");
    const branches = getCollection(COLLECTIONS.BRANCHES);
    const duplicate = await branches.findOne({ tenantId: scopedTenantId, code: normalizedCode });
    if (duplicate) fail("Branch code already exists.", 409);
    const now = new Date();
    const branch = { branchId: randomUUID(), tenantId: scopedTenantId, code: normalizedCode, name: normalizedName, status: "active", createdAt: now, updatedAt: now };
    await branches.insertOne(branch);
    return branch;
}

export async function listBranches(tenantId) {
    const scopedTenantId = assertTenantId(tenantId);
    return getCollection(COLLECTIONS.BRANCHES).find({ tenantId: scopedTenantId, status: "active" }).sort({ name: 1 }).toArray();
}

export async function requireActiveBranch(tenantId, branchId) {
    const scopedTenantId = assertTenantId(tenantId);
    const value = String(branchId || "").trim();
    if (!value) fail("Branch is required.");
    const branch = await getCollection(COLLECTIONS.BRANCHES).findOne({ tenantId: scopedTenantId, branchId: value, status: "active" });
    if (!branch) fail("Branch is not available in this tenant.", 404);
    return branch;
}
