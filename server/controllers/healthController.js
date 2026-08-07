import { getDatabase } from "../database/mongo.js";

export async function healthCheck(req, res) {
    try {
        const db = getDatabase();

        await db.command({ ping: 1 });

        res.json({
            success: true,
            application: "Universal Pharmacy Platform",
            api: "online",
            database: "connected"
        });

    } catch (error) {
        res.status(503).json({
            success: false,
            application: "Universal Pharmacy Platform",
            api: "online",
            database: "disconnected",
            error: error.message
        });
    }
}