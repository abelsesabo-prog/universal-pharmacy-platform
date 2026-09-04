import express from "express";
import cors from "cors";
import path from "node:path";
import { fileURLToPath } from "node:url";
import config from "./config/config.js";
import { connectMongoDB } from "./database/mongo.js";
import routes from "./routes/index.js";
import { securityHeaders, apiRateLimit, requestCorrelation } from "./middleware/security.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CLIENT_ROOT = path.resolve(__dirname, "../client");

export function createApp() {
    const app = express();
    app.disable("x-powered-by");
    app.use(requestCorrelation);
    app.use(securityHeaders);
    const corsOptions = config.security.corsOrigins.length ? { origin: config.security.corsOrigins } : { origin: false };
    app.use(cors(corsOptions));
    app.use(express.json({ limit: "1mb" }));
    app.use("/api", apiRateLimit, routes);
    app.use(express.static(CLIENT_ROOT, { index: "index.html", fallthrough: true }));
    app.use((req, res) => req.path.startsWith("/api/")
        ? res.status(404).json({ success: false, error: "API route not found.", requestId: req.id })
        : res.status(404).send("Not found"));
    app.use((error, req, res, next) => {
        if (res.headersSent) return next(error);
        const status = Number.isInteger(error.statusCode) ? error.statusCode : 500;
        if (status >= 500) console.error("Unhandled request error:", { requestId: req.id, error });
        return res.status(status).json({
            success: false,
            error: status >= 500 ? "Internal server error." : error.message,
            requestId: req.id
        });
    });
    return app;
}

const app = createApp();

async function startServer() {
    try {
        await connectMongoDB();
        app.listen(config.app.port, () => console.log(`${config.app.name} running on port ${config.app.port}`));
    } catch (error) {
        console.error("Server startup failed:", error.message);
        process.exit(1);
    }
}

const isMainModule = process.argv[1] && path.resolve(process.argv[1]) === __filename;
if (isMainModule && process.env.NODE_ENV !== "test") startServer();

export default app;
