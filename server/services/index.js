// ==========================================
// Universal Pharmacy Platform
// Service Layer
// ==========================================

import { getDatabase } from "../database/mongo.js";
import { COLLECTIONS } from "../../shared/schemas/index.js";

export function getCollection(collectionName) {
    const db = getDatabase();

    if (!Object.values(COLLECTIONS).includes(collectionName)) {
        throw new Error(`Unknown collection: ${collectionName}`);
    }

    return db.collection(collectionName);
}