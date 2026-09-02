import express from "express";
import cors from "cors";
import config from "./config/config.js";
import { connectMongoDB } from "./database/mongo.js";
import routes from "./routes/index.js";
import { securityHeaders, apiRateLimit } from "./middleware/security.js";

const app = express();

app.disable("x-powered-by");
app.use(securityHeaders);

const corsOptions = config.security.corsOrigins.length
    ? { origin: config.security.corsOrigins }
    : { origin: false };

app.use(cors(corsOptions));
app.use(express.json({ limit: "1mb" }));
app.use("/api", apiRateLimit, routes);

async function startServer() {
    try {
        await connectMongoDB();

        app.listen(config.app.port, () => {
            console.log(
                `${config.app.name} running on port ${config.app.port}`
            );
        });
    } catch (error) {
        console.error("Server startup failed:", error.message);
        process.exit(1);
    }
}

startServer();

export default app;
