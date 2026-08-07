const mongoose = require("mongoose");
const config = require("../config/config");

async function connectMongoDB() {
    if (!config.database.mongodbUri) {
        throw new Error("MONGODB_URI is not configured.");
    }

    try {
        await mongoose.connect(config.database.mongodbUri);

        console.log("MongoDB connected successfully.");
    } catch (error) {
        console.error("MongoDB connection failed:", error.message);
        throw error;
    }
}

async function disconnectMongoDB() {
    try {
        await mongoose.disconnect();
        console.log("MongoDB disconnected.");
    } catch (error) {
        console.error("MongoDB disconnect failed:", error.message);
    }
}

module.exports = {
    connectMongoDB,
    disconnectMongoDB
};