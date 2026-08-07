const express = require("express");
const config = require("./config/config");
const { connectMongoDB } = require("./database/mongo");
const routes = require("./routes");
const app = express();

app.use(express.json());

app.get("/api/health", async (req, res) => {
    res.json({
        success: true,
        application: config.app.name,
        environment: config.app.environment,
        database: "connected"
    });
});

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

module.exports = app;