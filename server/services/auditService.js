import { getCollection } from "./index.js";
import { COLLECTIONS } from "../../shared/schemas/index.js";

export async function recordAudit({ tenantId, actorId = null, action, resource, resourceId = null, details = null, requestId = null }) {
    if (!tenantId || !action || !resource) return null;
    const entry = { tenantId: String(tenantId), actorId: actorId ? String(actorId) : null, action: String(action), resource: String(resource), resourceId: resourceId ? String(resourceId) : null, details: details ?? null, requestId: requestId ? String(requestId) : null, createdAt: new Date() };
    const result = await getCollection(COLLECTIONS.AUDIT_LOGS).insertOne(entry);
    return { ...entry, _id: result.insertedId };
}

export async function listAuditLogs({ tenantId, resource, actorId, limit = 100, skip = 0 } = {}) {
    const filter = { tenantId };
    if (resource) filter.resource = String(resource);
    if (actorId) filter.actorId = String(actorId);
    const safeLimit = Math.min(Math.max(Number(limit) || 100, 1), 200);
    const safeSkip = Math.max(Number(skip) || 0, 0);
    return getCollection(COLLECTIONS.AUDIT_LOGS).find(filter).sort({ createdAt: -1 }).skip(safeSkip).limit(safeLimit).toArray();
}
