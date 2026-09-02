import jwt from "jsonwebtoken";
import config from "../config/config.js";
import { findActiveUserById, findActiveTenant } from "../services/identityService.js";

const ISSUER = "universal-pharmacy-platform";
const AUDIENCE = "universal-pharmacy-api";

export async function requireAuth(req, res, next) {
    const header = req.get("authorization") || "";

    if (!header.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Authentication required." });
    }

    const token = header.slice(7).trim();
    if (!token) {
        return res.status(401).json({ error: "Authentication required." });
    }

    try {
        const claims = jwt.verify(token, config.security.jwtSecret, {
            algorithms: ["HS256"],
            issuer: ISSUER,
            audience: AUDIENCE
        });

        const user = await findActiveUserById(claims.sub);
        if (!user || user.tenantId !== claims.tenantId || user.role !== claims.role) {
            return res.status(401).json({ error: "Authentication is no longer valid." });
        }

        const tenant = await findActiveTenant(claims.tenantId);
        if (!tenant) {
            return res.status(403).json({ error: "Tenant is inactive or unavailable." });
        }

        req.user = {
            sub: user.userId,
            username: user.username,
            tenantId: user.tenantId,
            role: user.role
        };

        return next();
    } catch {
        return res.status(401).json({ error: "Invalid or expired authentication token." });
    }
}

export function requireRole(...roles) {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({ error: "Insufficient permissions." });
        }
        return next();
    };
}
