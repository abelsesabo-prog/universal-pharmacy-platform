// ==========================================
// Universal Pharmacy Platform
// Shared Data Schemas
// ==========================================

export const SCHEMA_VERSION = 5;

export const COLLECTIONS = Object.freeze({
    TENANTS: "tenants", USERS: "users", BRANCHES: "branches", PRODUCTS: "products", BATCHES: "batches", SALES: "sales", SALE_ITEMS: "sale_items", PURCHASES: "purchases", PURCHASE_ITEMS: "purchase_items", STOCK_MOVEMENTS: "stock_movements", CUSTOMERS: "customers", SUPPLIERS: "suppliers", EXPENSES: "expenses", AUDIT_LOGS: "audit_logs", OFFLINE_EVENTS: "offline_events"
});

export const PRODUCT_SCHEMA = Object.freeze({ required: ["tenantId", "brandName", "genericName", "dosageForm", "category"], optional: ["strength", "strengthUnit", "manufacturer", "registrationAgency", "registrationNumber", "baseUnit", "uomMatrix", "barcode", "stockQuantity", "catalogInstalled", "catalogSource", "catalogFamilyId", "catalogRxcui"] });
export const BATCH_SCHEMA = Object.freeze({ required: ["tenantId", "productId", "batchNumber", "quantity", "expiryDate"], optional: ["branchId", "costPrice", "sellingPrice", "location", "supplierId"] });
export const STOCK_MOVEMENT_TYPES = Object.freeze(["PURCHASE", "SALE", "RETURN", "ADJUSTMENT", "TRANSFER_IN", "TRANSFER_OUT", "DAMAGE", "EXPIRED"]);
export const STOCK_MOVEMENT_SCHEMA = Object.freeze({ required: ["tenantId", "productId", "type", "quantity", "direction"], optional: ["batchId", "branchId", "reference", "notes", "unitCost", "createdBy"] });
export const SALE_SCHEMA = Object.freeze({ required: ["tenantId", "branchId", "subtotal", "total", "payments", "status", "createdAt"], optional: ["customerId", "cashierId", "discount"] });
export const SALE_ITEM_SCHEMA = Object.freeze({ required: ["tenantId", "saleId", "productId", "quantity", "unitPrice", "lineTotal", "uom", "conversionToBase", "baseQuantity", "createdAt"], optional: ["productName"] });

export const OFFLINE_EVENT_SCHEMA = Object.freeze({ required: ["eventId", "tenantId", "deviceId", "eventType", "occurredAt", "payload", "status"], optional: ["branchId", "userId", "sequence", "receivedAt", "processedAt", "error"] });
export const OFFLINE_EVENT_STATUSES = Object.freeze(["PENDING", "APPLIED", "REJECTED"]);
