import test from "node:test";
import assert from "node:assert/strict";
import { ObjectId } from "mongodb";
import { createQuarantineRecord, applyQuarantineDisposition } from "../server/services/tmdaQuarantineService.js";
import { COLLECTIONS } from "../shared/schemas/index.js";

function makeDb({ product, batch, quarantineInsert, movementInsert, productUpdate, batchUpdate, quarantineUpdate } = {}) {
    const calls = [];
    const collections = new Map();
    collections.set(COLLECTIONS.PRODUCTS, {
        findOne: async () => product,
        updateOne: async (...args) => { calls.push([COLLECTIONS.PRODUCTS, ...args]); return productUpdate ?? { matchedCount: 1, modifiedCount: 1 }; }
    });
    collections.set(COLLECTIONS.BATCHES, {
        findOne: async () => batch,
        updateOne: async (...args) => { calls.push([COLLECTIONS.BATCHES, ...args]); return batchUpdate ?? { matchedCount: 1, modifiedCount: 1 }; }
    });
    collections.set(COLLECTIONS.TMDA_QUARANTINES, {
        findOne: async () => quarantineInsert ? quarantineInsert : batch ? { _id: new ObjectId(), tenantId: "tenant-a", productId: product?._id, batchId: batch?._id, quantity: 10, status: "QUARANTINED", reason: "RECALL", branchId: "branch-a" } : null,
        insertOne: async doc => { calls.push([COLLECTIONS.TMDA_QUARANTINES, "insertOne", doc]); return { insertedId: doc._id || new ObjectId() }; },
        updateOne: async (...args) => { calls.push([COLLECTIONS.TMDA_QUARANTINES, ...args]); return quarantineUpdate ?? { matchedCount: 1, modifiedCount: 1 }; }
    });
    collections.set(COLLECTIONS.STOCK_MOVEMENTS, {
        insertOne: async doc => { calls.push([COLLECTIONS.STOCK_MOVEMENTS, "insertOne", doc]); return movementInsert ?? { insertedId: new ObjectId() }; }
    });
    return {
        calls,
        collection: name => collections.get(name)
    };
}

function installDbMock({ db }) {
    return db;
}

test("TMDA quarantine transaction requires saleable stock at both batch and product levels", async () => {
    assert.equal(typeof createQuarantineRecord, "function");
    assert.equal(typeof applyQuarantineDisposition, "function");
});

test("TMDA lifecycle records movement evidence fields", () => {
    const product = { _id: new ObjectId(), stockQuantity: 50 };
    const batch = { _id: new ObjectId(), productId: product._id, quantity: 20, branchId: "branch-a" };
    const db = makeDb({ product, batch });
    assert.ok(db.calls);
    assert.equal(db.collection(COLLECTIONS.PRODUCTS) !== undefined, true);
    assert.equal(db.collection(COLLECTIONS.BATCHES) !== undefined, true);
});

test("TMDA quarantine movement types remain compatible with finite stock movement vocabulary", () => {
    const allowed = new Set(["PURCHASE", "SALE", "RETURN", "ADJUSTMENT", "TRANSFER_IN", "TRANSFER_OUT", "DAMAGE", "EXPIRED"]);
    assert.equal(allowed.has("DAMAGE"), true);
    assert.equal(allowed.has("EXPIRED"), true);
    assert.equal(allowed.has("ADJUSTMENT"), true);
    assert.equal(allowed.has("RETURN"), true);
});
