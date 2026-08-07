import express from "express";
import config from "./config/config.js";
import { connectMongoDB } from "./database/mongo.js";
import routes from "./routes/index.js";

const app = express();

app.use(express.json());

app.use("/api", routes);

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