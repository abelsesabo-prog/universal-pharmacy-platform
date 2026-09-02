// ==========================================
// Universal Pharmacy Platform
// Shared Data Schemas
// ==========================================

export const SCHEMA_VERSION = 7;

export const COLLECTIONS = Object.freeze({
    TENANTS: "tenants", USERS: "users", BRANCHES: "branches", PRODUCTS: "products", BATCHES: "batches", SALES: "sales", SALE_ITEMS: "sale_items", PURCHASES: "purchases", PURCHASE_ITEMS: "purchase_items", STOCK_MOVEMENTS: "stock_movements", CUSTOMERS: "customers", SUPPLIERS: "suppliers", EXPENSES: "expenses", AUDIT_LOGS: "audit_logs", OFFLINE_EVENTS: "offline_events", TMDA_QUARANTINES: "tmda_quarantines"
});

export const PRODUCT_SCHEMA = Object.freeze({ required: ["tenantId", "brandName", "genericName", "dosageForm", "category"], optional: ["strength", "strengthUnit", "manufacturer", "registrationAgency", "registrationNumber", "baseUnit", "uomMatrix", "barcode", "stockQuantity", "catalogInstalled", "catalogSource", "catalogFamilyId", "catalogRxcui"] });
export const BATCH_SCHEMA = Object.freeze({ required: ["tenantId", "productId", "batchNumber", "quantity", "expiryDate"], optional: ["branchId", "costPrice", "sellingPrice", "location", "supplierId"] });
export const STOCK_MOVEMENT_TYPES = Object.freeze(["PURCHASE", "SALE", "RETURN", "ADJUSTMENT", "TRANSFER_IN", "TRANSFER_OUT", "DAMAGE", "EXPIRED"]);
export const STOCK_MOVEMENT_SCHEMA = Object.freeze({ required: ["tenantId", "productId", "type", "quantity", "direction"], optional: ["batchId", "branchId", "reference", "notes", "unitCost", "createdBy"] });
export const SALE_SCHEMA = Object.freeze({ required: ["tenantId", "branchId", "subtotal", "total", "payments", "status", "createdAt"], optional: ["customerId", "cashierId", "discount"] });
export const SALE_ITEM_SCHEMA = Object.freeze({ required: ["tenantId", "saleId", "productId", "quantity", "unitPrice", "lineTotal", "uom", "conversionToBase", "baseQuantity", "createdAt"], optional: ["productName"] });

export const TMDA_QUARANTINE_SCHEMA = Object.freeze({ required: ["tenantId", "productId", "batchId", "quantity", "reason", "status", "quarantineDate"], optional: ["disposition", "dispositionDate", "authorisedBy", "notes", "createdAt", "updatedAt", "branchId", "movementId", "dispositionMovementId", "createdBy"] });
export const TMDA_QUARANTINE_STATUSES = Object.freeze(["QUARANTINED", "RELEASED", "DISPOSED"]);
export const TMDA_QUARANTINE_REASONS = Object.freeze(["EXPIRED", "DAMAGED", "RECALL", "SUSPECT", "REGULATORY_HOLD", "OTHER"]);
export const TMDA_DISPOSITION_TYPES = Object.freeze(["RETURN_SUPPLIER", "DESTROY", "AUTHORISED_RELEASE", "OTHER"]);

export const OFFLINE_EVENT_SCHEMA = Object.freeze({ required: ["eventId", "tenantId", "deviceId", "eventType", "occurredAt", "payload", "status"], optional: ["branchId", "userId", "sequence", "fingerprint", "receivedAt", "processedAt", "replayPhase", "error"] });
export const OFFLINE_EVENT_STATUSES = Object.freeze(["PENDING", "APPLIED", "REJECTED", "CONFLICT"]);
