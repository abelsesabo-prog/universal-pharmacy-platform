import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import config from "../config/config.js";

export async function loginController(req, res) {
    const username = String(req.body?.username || "").trim();
    const password = String(req.body?.password || "");

    const configuredUsername = config.security.authUsername;
    const configuredHash = config.security.authPasswordHash;
    const tenantId = config.security.authTenantId;
    const role = config.security.authRole;

    if (!configuredUsername || !configuredHash || !tenantId) {
        return res.status(503).json({ error: "Authentication is not configured." });
    }

    const usernameMatches = username === configuredUsername;
    const passwordMatches = await bcrypt.compare(password, configuredHash).catch(() => false);

    if (!usernameMatches || !passwordMatches) {
        return res.status(401).json({ error: "Invalid credentials." });
    }

    const token = jwt.sign(
        {
            sub: username,
            tenantId,
            role
        },
        config.security.jwtSecret,
        {
            algorithm: "HS256",
            expiresIn: "8h",
            issuer: "universal-pharmacy-platform",
            audience: "universal-pharmacy-api"
        }
    );

    return res.json({ token, expiresIn: 28800 });
}
