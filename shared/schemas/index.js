// ==========================================
// Universal Pharmacy Platform
// Shared Data Schemas
// ==========================================

export const SCHEMA_VERSION = 4;

export const COLLECTIONS = Object.freeze({
    TENANTS: "tenants",
    USERS: "users",
    BRANCHES: "branches",
    PRODUCTS: "products",
    BATCHES: "batches",
    SALES: "sales",
    SALE_ITEMS: "sale_items",
    PURCHASES: "purchases",
    PURCHASE_ITEMS: "purchase_items",
    STOCK_MOVEMENTS: "stock_movements",
    CUSTOMERS: "customers",
    SUPPLIERS: "suppliers",
    EXPENSES: "expenses",
    AUDIT_LOGS: "audit_logs"
});

export const PRODUCT_SCHEMA = Object.freeze({
    required: ["tenantId", "brandName", "genericName", "dosageForm", "category"],
    optional: ["strength", "strengthUnit", "manufacturer", "registrationAgency", "registrationNumber", "baseUnit", "uomMatrix", "barcode", "stockQuantity", "catalogInstalled", "catalogSource", "catalogFamilyId", "catalogRxcui"]
});

export const BATCH_SCHEMA = Object.freeze({
    required: ["tenantId", "productId", "batchNumber", "quantity", "expiryDate"],
    optional: ["branchId", "costPrice", "sellingPrice", "location", "supplierId"]
});

export const STOCK_MOVEMENT_TYPES = Object.freeze(["PURCHASE", "SALE", "RETURN", "ADJUSTMENT", "TRANSFER_IN", "TRANSFER_OUT", "DAMAGE", "EXPIRED"]);

export const STOCK_MOVEMENT_SCHEMA = Object.freeze({
    required: ["tenantId", "productId", "type", "quantity", "direction"],
    optional: ["batchId", "branchId", "reference", "notes", "unitCost", "createdBy"]
});

// A sale is stored as a header in SALES; individual UOM-aware lines live in SALE_ITEMS.
export const SALE_SCHEMA = Object.freeze({
    required: ["tenantId", "branchId", "subtotal", "total", "payments", "status", "createdAt"],
    optional: ["customerId", "cashierId", "discount"]
});

export const SALE_ITEM_SCHEMA = Object.freeze({
    required: ["tenantId", "saleId", "productId", "quantity", "unitPrice", "lineTotal", "uom", "conversionToBase", "baseQuantity", "createdAt"],
    optional: ["productName"]
});