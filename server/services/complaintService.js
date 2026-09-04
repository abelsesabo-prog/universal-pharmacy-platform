import { getCollection } from "./index.js";
import { COLLECTIONS } from "../../shared/schemas/index.js";

const STATUSES = new Set(["OPEN", "IN_REVIEW", "RESOLVED", "CLOSED"]);
const PRIORITIES = new Set(["LOW", "NORMAL", "HIGH", "URGENT"]);
function fail(message, statusCode = 400) { const error = new Error(message); error.statusCode = statusCode; throw error; }
function text(value) { return String(value ?? "").trim(); }

export function validateComplaint(input = {}) {
    const tenantId = text(input.tenantId);
    if (!tenantId) fail("Tenant context is required.", 403);
    const subject = text(input.subject);
    const description = text(input.description);
    if (!subject) fail("Complaint subject is required.");
    if (!description) fail("Complaint description is required.");
    const priority = text(input.priority).toUpperCase() || "NORMAL";
    if (!PRIORITIES.has(priority)) fail("Unsupported complaint priority.");
    return {
        tenantId,
        branchId: text(input.branchId) || null,
        customerId: text(input.customerId) || null,
        category: text(input.category) || "GENERAL",
        subject,
        description,
        priority,
        status: "OPEN",
        assignedTo: text(input.assignedTo) || null
    };
}

export async function createComplaint(input) {
    const complaint = validateComplaint(input);
    const now = new Date();
    const result = await getCollection(COLLECTIONS.COMPLAINTS).insertOne({ ...complaint, createdAt: now, updatedAt: now });
    return { ...complaint, _id: result.insertedId, createdAt: now, updatedAt: now };
}

export async function updateComplaint({ tenantId, complaintId, status, assignedTo, resolution } = {}) {
    if (!text(tenantId)) fail("Tenant context is required.", 403);
    const normalizedStatus = text(status).toUpperCase();
    if (!STATUSES.has(normalizedStatus)) fail("Unsupported complaint status.");
    const update = { status: normalizedStatus, updatedAt: new Date() };
    if (assignedTo !== undefined) update.assignedTo = text(assignedTo) || null;
    if (resolution !== undefined) update.resolution = text(resolution) || null;
    const result = await getCollection(COLLECTIONS.COMPLAINTS).findOneAndUpdate({ _id: complaintId, tenantId: text(tenantId) }, { $set: update }, { returnDocument: "after" });
    if (!result) fail("Complaint not found.", 404);
    return result;
}

export async function listComplaints({ tenantId, branchId, status, limit = 100, skip = 0 } = {}) {
    if (!text(tenantId)) fail("Tenant context is required.", 403);
    const filter = { tenantId: text(tenantId) };
    if (text(branchId)) filter.branchId = text(branchId);
    if (text(status)) {
        const normalized = text(status).toUpperCase();
        if (!STATUSES.has(normalized)) fail("Unsupported complaint status.");
        filter.status = normalized;
    }
    const safeLimit = Math.min(Math.max(Number(limit) || 100, 1), 200);
    const safeSkip = Math.max(Number(skip) || 0, 0);
    return getCollection(COLLECTIONS.COMPLAINTS).find(filter).sort({ createdAt: -1 }).skip(safeSkip).limit(safeLimit).toArray();
}
