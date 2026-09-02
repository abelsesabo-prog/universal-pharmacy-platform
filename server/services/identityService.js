// ==========================================
// Universal Pharmacy Platform
// Identity & Tenant Service
// ==========================================

import { randomUUID } from "node:crypto";
import { getCollection } from "./index.js";
import { COLLECTIONS } from "../../shared/schemas/index.js";

const ALLOWED_ROLES = new Set(["admin", "manager", "staff"]);

export function normalizeRole(role) {
    const normalized = String(role || "").trim().toLowerCase();
    return ALLOWED_ROLES.has(normalized) ? normalized : "staff";
}

export async function ensureBootstrapIdentity({ username, passwordHash, tenantId, role }) {
    const tenants = getCollection(COLLECTIONS.TENANTS);
    const users = getCollection(COLLECTIONS.USERS);
    const normalizedTenantId = String(tenantId || "").trim();
    const normalizedUsername = String(username || "").trim();

    if (!normalizedTenantId || !normalizedUsername || !passwordHash) return null;

    await tenants.updateOne(
        { tenantId: normalizedTenantId },
        {
            $setOnInsert: {
                tenantId: normalizedTenantId,
                name: normalizedTenantId,
                status: "active",
                createdAt: new Date()
            }
        },
        { upsert: true }
    );

    const existing = await users.findOne({ username: normalizedUsername });
    if (existing) return existing;

    const user = {
        userId: randomUUID(),
        username: normalizedUsername,
        passwordHash,
        tenantId: normalizedTenantId,
        role: normalizeRole(role),
        status: "active",
        createdAt: new Date(),
        updatedAt: new Date()
    };

    await users.insertOne(user);
    return user;
}

export async function findActiveUser(username) {
    return getCollection(COLLECTIONS.USERS).findOne({
        username: String(username || "").trim(),
        status: "active"
    });
}

export async function findActiveUserById(userId) {
    return getCollection(COLLECTIONS.USERS).findOne({
        userId: String(userId || "").trim(),
        status: "active"
    });
}

export async function findActiveTenant(tenantId) {
    return getCollection(COLLECTIONS.TENANTS).findOne({
        tenantId: String(tenantId || "").trim(),
        status: "active"
    });
}
