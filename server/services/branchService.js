import { randomUUID } from "node:crypto";
import { getCollection } from "./index.js";
import { COLLECTIONS } from "../../shared/schemas/index.js";

function fail(message, statusCode = 400) { const error = new Error(message); error.statusCode = statusCode; throw error; }

export async function ensureDefaultBranch(tenantId) {
    const branches = getCollection(COLLECTIONS.BRANCHES);
    const existing = await branches.findOne({ tenantId, code: "MAIN", status: "active" });
    if (existing) return existing;
    const now = new Date();
    const branch = { branchId: randomUUID(), tenantId, code: "MAIN", name: "Main Branch", status: "active", createdAt: now, updatedAt: now };
    await branches.insertOne(branch);
    return branch;
}

export async function createBranch({ tenantId, code, name }) {
    const normalizedCode = String(code || "").trim().toUpperCase();
    const normalizedName = String(name || "").trim();
    if (!tenantId) fail("Tenant context is required.", 403);
    if (!normalizedCode || !normalizedName) fail("Branch code and name are required.");
    const branches = getCollection(COLLECTIONS.BRANCHES);
    const duplicate = await branches.findOne({ tenantId, code: normalizedCode });
    if (duplicate) fail("Branch code already exists.", 409);
    const now = new Date();
    const branch = { branchId: randomUUID(), tenantId, code: normalizedCode, name: normalizedName, status: "active", createdAt: now, updatedAt: now };
    await branches.insertOne(branch);
    return branch;
}

export async function listBranches(tenantId) {
    return getCollection(COLLECTIONS.BRANCHES).find({ tenantId, status: "active" }).sort({ name: 1 }).toArray();
}

export async function requireActiveBranch(tenantId, branchId) {
    const value = String(branchId || "").trim();
    if (!value) fail("Branch is required.");
    const branch = await getCollection(COLLECTIONS.BRANCHES).findOne({ tenantId, branchId: value, status: "active" });
    if (!branch) fail("Branch is not available in this tenant.", 404);
    return branch;
}
