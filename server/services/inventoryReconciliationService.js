import { ObjectId } from "mongodb";
import { getDatabase } from "../database/mongo.js";
import { COLLECTIONS } from "../../shared/schemas/index.js";
import { canonicalProductIdentity } from "./invoiceProductResolver.js";

function text(value) { return String(value ?? "").trim(); }
function fail(message, statusCode = 400) { const error = new Error(message); error.statusCode = statusCode; throw error; }

export async function reconcileInvoiceChain({ tenantId, productId, batchId, movementId, expected }) {
    if (!text(tenantId)) fail("Tenant context is required.", 403);
    if (!ObjectId.isValid(productId) || !ObjectId.isValid(batchId) || !ObjectId.isValid(movementId)) fail("Invalid reconciliation reference.");

    const db = getDatabase();
    const [product, batch, movement] = await Promise.all([
        db.collection(COLLECTIONS.PRODUCTS).findOne({ _id: new ObjectId(productId), tenantId: text(tenantId) }),
        db.collection(COLLECTIONS.BATCHES).findOne({ _id: new ObjectId(batchId), tenantId: text(tenantId), productId: new ObjectId(productId) }),
        db.collection(COLLECTIONS.STOCK_MOVEMENTS).findOne({ _id: new ObjectId(movementId), tenantId: text(tenantId), productId: new ObjectId(productId), batchId: new ObjectId(batchId) })
    ]);

    const checks = {
        tenantIsolation: Boolean(product && batch && movement),
        canonicalIdentity: Boolean(product && product.identityKey === canonicalProductIdentity(product)),
        batchProductLink: Boolean(batch && String(batch.productId) === String(productId)),
        movementBatchLink: Boolean(movement && String(movement.batchId) === String(batchId)),
        purchaseDirection: movement?.type === "PURCHASE" && movement?.direction === "IN",
        quantityAgreement: expected?.baseQuantity == null || (
            Number(batch?.quantity) === Number(expected.baseQuantity) &&
            Number(movement?.quantity) === Number(expected.baseQuantity)
        ),
        stockAgreement: expected?.stockQuantityAfter == null || Number(product?.stockQuantity) === Number(expected.stockQuantityAfter)
    };

    return {
        valid: Object.values(checks).every(Boolean),
        checks,
        identityKey: product?.identityKey || null,
        product,
        batch,
        movement
    };
}
