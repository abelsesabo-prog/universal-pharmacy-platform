import { getDatabase } from "../database/mongo.js";
import config from "../config/config.js";

export async function healthCheck(req, res) {
    const startedAt = Date.now();
    try {
        const db = getDatabase();
        await db.command({ ping: 1 });

        return res.status(200).json({
            success: true,
            application: config.app.name,
            api: "online",
            database: "connected",
            environment: config.app.environment,
            uptimeSeconds: Math.floor(process.uptime()),
            latencyMs: Date.now() - startedAt,
            requestId: req.id
        });
    } catch (error) {
        console.error("Health check failed:", { requestId: req.id, error: error.message });
        return res.status(503).json({
            success: false,
            application: config.app.name,
            api: "online",
            database: "disconnected",
            requestId: req.id
        });
    }
}
