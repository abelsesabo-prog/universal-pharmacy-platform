import {
    createQuarantineRecord,
    applyQuarantineDisposition
} from "../services/tmdaQuarantineService.js";

export async function createQuarantineController(req, res, next) {
    try {
        const record = await createQuarantineRecord({
            ...req.body,
            tenantId: req.user.tenantId,
            createdBy: req.user.sub
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
            createdBy: req.user.sub
        });
        return res.status(200).json({ success: true, record });
    } catch (error) {
        return next(error);
    }
}
