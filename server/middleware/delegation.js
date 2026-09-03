import { authorizeDelegatedAction } from "../services/delegationService.js";

export function requireRoleOrDelegation(scope, roles = []) {
    return async (req, res, next) => {
        if (req.user && roles.includes(req.user.role)) return next();
        try {
            const result = await authorizeDelegatedAction({
                tenantId: req.tenantId || req.user?.tenantId,
                actorId: req.user?.sub || req.user?.userId,
                scope,
                value: req.body?.amount ?? req.body?.value ?? 0
            });
            if (!result.authorized) return res.status(403).json({ error: "Insufficient permissions and no active delegation covers this action." });
            req.delegation = result;
            return next();
        } catch (error) {
            return res.status(error.statusCode || 403).json({ error: error.message });
        }
    };
}
