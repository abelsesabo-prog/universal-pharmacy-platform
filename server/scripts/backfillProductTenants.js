// One-time data migration for legacy products created before tenant isolation.
// Safety: the target tenant must be supplied explicitly.

import "dotenv/config";
import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;
const tenantId = String(process.env.MIGRATION_TENANT_ID || "").trim();

if (!uri) throw new Error("MONGODB_URI is required.");
if (!tenantId) throw new Error("MIGRATION_TENANT_ID is required.");

const client = new MongoClient(uri);

try {
    await client.connect();
    const db = client.db();
    const products = db.collection("products");

    const result = await products.updateMany(
        { $or: [{ tenantId: { $exists: false } }, { tenantId: null }, { tenantId: "" }] },
        { $set: { tenantId } }
    );

    console.log(`Tenant backfill complete. Matched: ${result.matchedCount}, modified: ${result.modifiedCount}.`);
} finally {
    await client.close();
}
