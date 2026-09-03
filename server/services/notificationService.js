import { getCollection } from "./index.js";
import { COLLECTIONS } from "../../shared/schemas/index.js";

const PRIORITIES = new Set(["LOW", "NORMAL", "HIGH", "CRITICAL"]);
const STATUSES = new Set(["PENDING", "SENT", "FAILED", "CANCELLED"]);
function fail(message, statusCode = 400) { const e = new Error(message); e.statusCode = statusCode; throw e; }
function text(v) { return String(v ?? "").trim(); }
function tenant(v) { const id = text(v); if (!id) fail("Tenant context is required.", 403); return id; }

export function validateNotification(input = {}) {
    const tenantId = tenant(input.tenantId); const channel = text(input.channel).toUpperCase(); const recipient = text(input.recipient); const message = text(input.message); const priority = text(input.priority || "NORMAL").toUpperCase();
    if (!["EMAIL", "SMS", "WEBHOOK", "IN_APP"].includes(channel)) fail("Unsupported notification channel.");
    if (!recipient || !message) fail("Notification recipient and message are required.");
    if (!PRIORITIES.has(priority)) fail("Unsupported notification priority.");
    return { tenantId, channel, recipient, message, priority, status: "PENDING", attempts: 0, createdAt: new Date() };
}
export async function queueNotification(input) { const notification = validateNotification(input); const result = await getCollection(COLLECTIONS.NOTIFICATIONS).insertOne(notification); return { ...notification, _id: result.insertedId }; }
export async function listNotifications({ tenantId, status, limit = 100 } = {}) { const filter = { tenantId: tenant(tenantId) }; if (status) { const s = text(status).toUpperCase(); if (!STATUSES.has(s)) fail("Unsupported notification status."); filter.status = s; } return getCollection(COLLECTIONS.NOTIFICATIONS).find(filter).sort({ createdAt: -1 }).limit(Math.min(Math.max(Number(limit) || 100, 1), 200)).toArray(); }
export async function markNotification({ tenantId, notificationId, status, error } = {}) { const s = text(status).toUpperCase(); if (!STATUSES.has(s)) fail("Unsupported notification status."); const result = await getCollection(COLLECTIONS.NOTIFICATIONS).findOneAndUpdate({ _id: notificationId, tenantId: tenant(tenantId) }, { $set: { status: s, updatedAt: new Date(), lastError: text(error) || null }, $inc: { attempts: 1 } }, { returnDocument: "after" }); if (!result.value) fail("Notification not found.", 404); return result.value; }
