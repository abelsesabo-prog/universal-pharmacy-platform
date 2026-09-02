import jwt from "jsonwebtoken";
import config from "../config/config.js";

export function requireAuth(req, res, next) {
    const header = req.get("authorization") || "";

    if (!header.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Authentication required." });
    }

    const token = header.slice(7).trim();

    if (!token) {
        return res.status(401).json({ error: "Authentication required." });
    }

    try {
        req.user = jwt.verify(token, config.security.jwtSecret, {
            algorithms: ["HS256"],
            issuer: "universal-pharmacy-platform",
            audience: "universal-pharmacy-api"
        });
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
