import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import config from "../config/config.js";
import { findActiveUser, ensureBootstrapIdentity, normalizeRole } from "../services/identityService.js";

const ISSUER = "universal-pharmacy-platform";
const AUDIENCE = "universal-pharmacy-api";

export async function loginController(req, res) {
    const username = String(req.body?.username || "").trim();
    const password = String(req.body?.password || "");

    if (!username || !password) {
        return res.status(400).json({ error: "Username and password are required." });
    }

    try {
        let user = await findActiveUser(username);

        // One-time bootstrap: if the configured identity does not exist yet,
        // persist it in MongoDB so future authentication is database-backed.
        if (
            !user &&
            username === config.security.authUsername &&
            config.security.authPasswordHash &&
            config.security.authTenantId
        ) {
            user = await ensureBootstrapIdentity({
                username: config.security.authUsername,
                passwordHash: config.security.authPasswordHash,
                tenantId: config.security.authTenantId,
                role: config.security.authRole
            });
        }

        if (!user) {
            return res.status(401).json({ error: "Invalid credentials." });
        }

        const passwordMatches = await bcrypt
            .compare(password, user.passwordHash)
            .catch(() => false);

        if (!passwordMatches) {
            return res.status(401).json({ error: "Invalid credentials." });
        }

        const token = jwt.sign(
            {
                sub: user.userId,
                username: user.username,
                tenantId: user.tenantId,
                role: normalizeRole(user.role)
            },
            config.security.jwtSecret,
            {
                algorithm: "HS256",
                expiresIn: "8h",
                issuer: ISSUER,
                audience: AUDIENCE
            }
        );

        return res.json({ token, expiresIn: 28800 });
    } catch (error) {
        console.error("Authentication failed:", error.message);
        return res.status(500).json({ error: "Authentication service unavailable." });
    }
}
