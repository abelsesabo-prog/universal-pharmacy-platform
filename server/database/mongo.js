import { MongoClient } from "mongodb";
import config from "../config/config.js";
import { COLLECTIONS } from "../../shared/schemas/index.js";

let client = null;
let database = null;

async function ensureSecurityIndexes(db) {
    await db.collection(COLLECTIONS.TENANTS).createIndex({ tenantId: 1 }, { unique: true, name: "uq_tenant_id" });
    await db.collection(COLLECTIONS.USERS).createIndex({ username: 1 }, { unique: true, name: "uq_username" });
    await db.collection(COLLECTIONS.USERS).createIndex({ tenantId: 1, status: 1 }, { name: "idx_user_tenant_status" });
    await db.collection(COLLECTIONS.PRODUCTS).createIndex({ tenantId: 1, brandName: 1, genericName: 1, dosageForm: 1, strength: 1 }, { name: "idx_product_tenant_identity" });
    await db.collection(COLLECTIONS.BATCHES).createIndex({ tenantId: 1, productId: 1, expiryDate: 1 }, { name: "idx_batch_tenant_product_expiry" });
    await db.collection(COLLECTIONS.BATCHES).createIndex({ tenantId: 1, batchNumber: 1 }, { unique: true, name: "uq_batch_tenant_number" });
    await db.collection(COLLECTIONS.STOCK_MOVEMENTS).createIndex({ tenantId: 1, productId: 1, createdAt: -1 }, { name: "idx_movement_tenant_product_date" });
}

async function connectMongoDB() {
    if (!config.database.mongodbUri) throw new Error("MONGODB_URI is not configured.");
    try {
        client = new MongoClient(config.database.mongodbUri);
        await client.connect();
        database = client.db();
        await ensureSecurityIndexes(database);
        console.log("MongoDB connected successfully.");
        return database;
    } catch (error) {
        console.error("MongoDB connection failed:", error.message);
        throw error;
    }
}

async function disconnectMongoDB() {
    try {
        if (client) await client.close();
        client = null;
        database = null;
        console.log("MongoDB disconnected.");
    } catch (error) {
        console.error("MongoDB disconnect failed:", error.message);
    }
}

function getDatabase() {
    if (!database) throw new Error("MongoDB is not connected.");
    return database;
}

function getMongoClient() {
    if (!client) throw new Error("MongoDB is not connected.");
    return client;
}

export { connectMongoDB, disconnectMongoDB, getDatabase, getMongoClient };
