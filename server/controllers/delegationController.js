import { createDelegation, revokeDelegation, authorizeDelegatedAction } from "../services/delegationService.js";

export async function createDelegationController(req, res) {
    try {
        const delegation = await createDelegation({ ...req.body, tenantId: req.tenantId, delegatorId: req.user?.sub || req.user?.userId || req.body?.delegatorId });
        return res.status(201).json({ success: true, delegation });
    } catch (error) { return res.status(error.statusCode || 500).json({ success: false, error: error.message }); }
}

export async function revokeDelegationController(req, res) {
    try {
        const delegation = await revokeDelegation({ tenantId: req.tenantId, delegationId: req.params.id, actorId: req.user?.sub || req.user?.userId, reason: req.body?.reason });
        return res.status(200).json({ success: true, delegation });
    } catch (error) { return res.status(error.statusCode || 500).json({ success: false, error: error.message }); }
}

export async function authorizeDelegatedActionController(req, res) {
    try {
        const result = await authorizeDelegatedAction({ tenantId: req.tenantId, actorId: req.user?.sub || req.user?.userId, scope: req.body?.scope, value: req.body?.value, at: req.body?.at });
        return res.status(result.authorized ? 200 : 403).json({ success: result.authorized, ...result });
    } catch (error) { return res.status(error.statusCode || 500).json({ success: false, error: error.message }); }
}
