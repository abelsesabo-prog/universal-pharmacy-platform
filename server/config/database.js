import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;

if (!uri) {
    throw new Error("MONGODB_URI is not configured.");
}

const client = new MongoClient(uri);

let database;

export async function connectDatabase() {
    if (database) {
        return database;
    }

    await client.connect();

    database = client.db(
        process.env.MONGODB_DATABASE || "universal_pharmacy"
    );

    console.log("MongoDB connected successfully.");

    return database;
}

export function getDatabase() {
    if (!database) {
        throw new Error("Database is not connected.");
    }

    return database;
}