import {
    createQuarantineRecord,
    applyQuarantineDisposition
} from "../services/tmdaQuarantineService.js";
import { recordAudit } from "../services/auditService.js";

function actorId(req) {
    return req.user?.sub ? String(req.user.sub) : null;
}

async function auditTmda(req, { action, resourceId, details }) {
    return recordAudit({
        tenantId: req.user.tenantId,
        actorId: actorId(req),
        action,
        resource: "TMDA_QUARANTINE",
        resourceId,
        details,
        requestId: req.get("x-request-id") || null
    });
}

export async function createQuarantineController(req, res, next) {
    try {
        const record = await createQuarantineRecord({
            ...req.body,
            tenantId: req.user.tenantId,
            createdBy: actorId(req)
        });

        await auditTmda(req, {
            action: "TMDA_QUARANTINE_CREATED",
            resourceId: record._id,
            details: {
                productId: record.productId?.toString?.() ?? record.productId,
                batchId: record.batchId?.toString?.() ?? record.batchId,
                quantity: record.quantity,
                reason: record.reason
            }
        });

        return res.status(201).json({ success: true, record });
    } catch (error) {
        return next(error);
    }
}

export async function applyQuarantineDispositionController(req, res, next) {
    try {
        const record = await applyQuarantineDisposition({
            ...req.body,
            tenantId: req.user.tenantId,
            quarantineId: req.params.id,
            createdBy: actorId(req)
        });

        await auditTmda(req, {
            action: "TMDA_QUARANTINE_DISPOSITION_APPLIED",
            resourceId: record._id,
            details: {
                disposition: record.disposition,
                status: record.status,
                quantity: record.quantity,
                authorisedBy: record.authorisedBy
            }
        });

        return res.status(200).json({ success: true, record });
    } catch (error) {
        return next(error);
    }
}
