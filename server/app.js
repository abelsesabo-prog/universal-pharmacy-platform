import path from "path";
import { fileURLToPath } from "url";
import express from "express";

import config from "./config/config.js";
import { connectMongoDB } from "./database/mongo.js";
import routes from "./routes/index.js";
import {
    errorHandler
} from "./middleware/errorHandler.js";


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(express.json());

app.use(express.static(path.join(__dirname, "../client")));

app.use("/api", routes);
app.use(
    errorHandler
);

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

