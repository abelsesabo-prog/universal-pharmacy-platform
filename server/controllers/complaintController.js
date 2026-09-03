import { ObjectId } from "mongodb";
import { createComplaint, listComplaints, updateComplaint } from "../services/complaintService.js";
import { recordAudit } from "../services/auditService.js";

export async function createComplaintController(req, res, next) {
    try {
        const complaint = await createComplaint({ tenantId: req.user.tenantId, branchId: req.body.branchId, customerId: req.body.customerId, category: req.body.category, subject: req.body.subject, description: req.body.description, priority: req.body.priority });
        try { await recordAudit({ tenantId: req.user.tenantId, actorId: req.user.sub, action: "COMPLAINT_CREATED", resource: "complaint", resourceId: complaint._id, details: { category: complaint.category, priority: complaint.priority }, requestId: req.id }); } catch (error) { console.error("Audit log write failed:", error.message); }
        return res.status(201).json({ success: true, complaint });
    } catch (error) { return next(error); }
}

export async function listComplaintsController(req, res, next) {
    try { const complaints = await listComplaints({ tenantId: req.user.tenantId, branchId: req.query.branchId, status: req.query.status, limit: req.query.limit, skip: req.query.skip }); return res.json({ success: true, count: complaints.length, complaints }); }
    catch (error) { return next(error); }
}

export async function updateComplaintController(req, res, next) {
    try {
        if (!ObjectId.isValid(req.params.id)) return res.status(400).json({ success: false, error: "Invalid complaint ID." });
        const complaint = await updateComplaint({ tenantId: req.user.tenantId, complaintId: new ObjectId(req.params.id), status: req.body.status, assignedTo: req.body.assignedTo, resolution: req.body.resolution });
        try { await recordAudit({ tenantId: req.user.tenantId, actorId: req.user.sub, action: "COMPLAINT_UPDATED", resource: "complaint", resourceId: complaint._id, details: { status: complaint.status, assignedTo: complaint.assignedTo }, requestId: req.id }); } catch (error) { console.error("Audit log write failed:", error.message); }
        return res.json({ success: true, complaint });
    } catch (error) { return next(error); }
}
