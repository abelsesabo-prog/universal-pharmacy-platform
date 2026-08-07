import { MongoClient } from "mongodb";
import config from "../config/config.js";

let client = null;
let database = null;

async function connectMongoDB() {
    if (!config.database.mongodbUri) {
        throw new Error("MONGODB_URI is not configured.");
    }

    try {
        client = new MongoClient(config.database.mongodbUri);

        await client.connect();

        database = client.db();

        console.log("MongoDB connected successfully.");

        return database;
    } catch (error) {
        console.error("MongoDB connection failed:", error.message);
        throw error;
    }
}

async function disconnectMongoDB() {
    try {
        if (client) {
            await client.close();
            client = null;
            database = null;
        }

        console.log("MongoDB disconnected.");
    } catch (error) {
        console.error("MongoDB disconnect failed:", error.message);
    }
}

function getDatabase() {
    if (!database) {
        throw new Error("MongoDB is not connected.");
    }

    return database;
}

export {
    connectMongoDB,
    disconnectMongoDB,
    getDatabase
};