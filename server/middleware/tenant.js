// ==========================================
// Universal Pharmacy Platform
// Tenant Context Middleware
// ==========================================

export function requireTenant(req, res, next) {
    const tenantId = String(req.user?.tenantId || "").trim();

    if (!tenantId) {
        return res.status(403).json({ error: "Tenant context is required." });
    }

    req.tenantId = tenantId;
    return next();
}
