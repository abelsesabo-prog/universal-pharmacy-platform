import { listAuditLogs } from "../services/auditService.js";

export async function listAuditLogsController(req, res, next) {
    try {
        const logs = await listAuditLogs({ tenantId: req.user.tenantId, resource: req.query.resource, actorId: req.query.actorId, limit: req.query.limit, skip: req.query.skip });
        return res.json({ success: true, count: logs.length, logs });
    } catch (error) { return next(error); }
}
