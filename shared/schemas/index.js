// ==========================================
// Universal Pharmacy Platform
// Shared Data Schemas
// ==========================================

export const SCHEMA_VERSION = 11;

export const COLLECTIONS = Object.freeze({
    TENANTS: "tenants", USERS: "users", BRANCHES: "branches", PRODUCTS: "products", BATCHES: "batches", SALES: "sales", SALE_ITEMS: "sale_items", PURCHASES: "purchases", PURCHASE_ITEMS: "purchase_items", STOCK_MOVEMENTS: "stock_movements", CUSTOMERS: "customers", SUPPLIERS: "suppliers", EXPENSES: "expenses", FINANCIAL_ENTRIES: "financial_entries", LEDGER_JOURNALS: "ledger_journals", COMPLAINTS: "complaints", AUDIT_LOGS: "audit_logs", OFFLINE_EVENTS: "offline_events", TMDA_QUARANTINES: "tmda_quarantines", NOTIFICATIONS: "notifications", INTEGRATIONS: "integrations", MIGRATION_RUNS: "migration_runs", RECOVERY_DRILLS: "recovery_drills", DEVICES: "devices", INSURANCE_ELIGIBILITY: "insurance_eligibility", INSURANCE_PREAUTHORIZATIONS: "insurance_preauthorizations", INSURANCE_CLAIM_BATCHES: "insurance_claim_batches", EXPIRY_RELOCATION_PLANS: "expiry_relocation_plans", DELEGATIONS: "delegations", EFD_DOCUMENTS: "efd_documents"
});

export const PRODUCT_SCHEMA = Object.freeze({ required: ["tenantId", "brandName", "genericName", "dosageForm", "category"], optional: ["strength", "strengthUnit", "manufacturer", "registrationAgency", "registrationNumber", "baseUnit", "uomMatrix", "barcode", "stockQuantity", "catalogInstalled", "catalogSource", "catalogFamilyId", "catalogRxcui"] });
export const BATCH_SCHEMA = Object.freeze({ required: ["tenantId", "productId", "batchNumber", "quantity", "expiryDate"], optional: ["branchId", "costPrice", "sellingPrice", "location", "supplierId"] });
export const STOCK_MOVEMENT_TYPES = Object.freeze(["PURCHASE", "SALE", "RETURN", "ADJUSTMENT", "TRANSFER_IN", "TRANSFER_OUT", "DAMAGE", "EXPIRED"]);
export const STOCK_MOVEMENT_SCHEMA = Object.freeze({ required: ["tenantId", "productId", "type", "quantity", "direction"], optional: ["batchId", "branchId", "reference", "notes", "unitCost", "createdBy"] });
export const SALE_SCHEMA = Object.freeze({ required: ["tenantId", "branchId", "subtotal", "total", "payments", "status", "createdAt"], optional: ["customerId", "cashierId", "discount"] });
export const SALE_ITEM_SCHEMA = Object.freeze({ required: ["tenantId", "saleId", "productId", "quantity", "unitPrice", "lineTotal", "uom", "conversionToBase", "baseQuantity", "createdAt"], optional: ["productName"] });
export const FINANCIAL_ENTRY_SCHEMA = Object.freeze({ required: ["tenantId", "account", "direction", "amount", "paymentMethod", "occurredAt"], optional: ["branchId", "referenceType", "referenceId", "description", "createdAt"] });
export const LEDGER_JOURNAL_SCHEMA = Object.freeze({ required: ["tenantId", "currency", "lines", "immutable", "idempotencyKey", "createdAt"], optional: ["branchId", "referenceType", "referenceId", "description"] });
export const COMPLAINT_SCHEMA = Object.freeze({ required: ["tenantId", "subject", "description", "priority", "status", "createdAt"], optional: ["branchId", "customerId", "category", "assignedTo", "resolution", "updatedAt"] });
export const NOTIFICATION_SCHEMA = Object.freeze({ required: ["tenantId", "channel", "recipient", "message", "priority", "status", "attempts", "createdAt"], optional: ["lastError", "updatedAt"] });
export const INTEGRATION_SCHEMA = Object.freeze({ required: ["tenantId", "type", "provider", "state", "idempotencyNamespace"], optional: ["externalId", "timeoutMs", "retryMax"] });
export const DEVICE_SCHEMA = Object.freeze({ required: ["tenantId", "deviceId", "status", "registeredAt"], optional: ["branchId", "userId", "revokedAt", "lastSeenAt"] });
export const MIGRATION_RUN_SCHEMA = Object.freeze({ required: ["tenantId", "status", "createdAt"], optional: ["source", "dryRun", "rows", "rollbackRef", "completedAt"] });
export const INSURANCE_ELIGIBILITY_SCHEMA = Object.freeze({ required: ["tenantId", "scheme", "memberId", "status", "checkedAt"], optional: ["patientId", "expiresAt", "responseReference", "evidence"] });
export const INSURANCE_PREAUTH_SCHEMA = Object.freeze({ required: ["tenantId", "scheme", "memberId", "requestedAmount", "status", "createdAt"], optional: ["authorizationId", "patientId", "expiresAt", "evidence"] });
export const INSURANCE_CLAIM_BATCH_SCHEMA = Object.freeze({ required: ["tenantId", "scheme", "claims", "status", "createdAt"], optional: ["submissionReference", "submittedAt", "response"] });
export const EXPIRY_RELOCATION_SCHEMA = Object.freeze({ required: ["tenantId", "batchId", "fromBranchId", "toBranchId", "quantity", "status", "createdAt"], optional: ["reason", "executeBy", "executedAt", "movementIds"] });
export const DELEGATION_SCHEMA = Object.freeze({ required: ["tenantId", "delegatorId", "delegateeId", "scope", "status", "startsAt", "expiresAt", "createdAt"], optional: ["valueCap", "reason", "reviewRequired", "revokedAt"] });
export const EFD_DOCUMENT_SCHEMA = Object.freeze({ required: ["tenantId", "provider", "idempotencyKey", "status", "createdAt"], optional: ["saleId", "documentNumber", "request", "response", "submittedAt", "error"] });

export const TMDA_QUARANTINE_SCHEMA = Object.freeze({ required: ["tenantId", "productId", "batchId", "quantity", "reason", "status", "quarantineDate"], optional: ["disposition", "dispositionDate", "authorisedBy", "notes", "createdAt", "updatedAt", "branchId", "movementId", "dispositionMovementId", "createdBy"] });
export const TMDA_QUARANTINE_STATUSES = Object.freeze(["QUARANTINED", "RELEASED", "DISPOSED"]);
export const TMDA_QUARANTINE_REASONS = Object.freeze(["EXPIRED", "DAMAGED", "RECALL", "SUSPECT", "REGULATORY_HOLD", "OTHER"]);
export const TMDA_DISPOSITION_TYPES = Object.freeze(["RETURN_SUPPLIER", "DESTROY", "AUTHORISED_RELEASE", "OTHER"]);

export const OFFLINE_EVENT_SCHEMA = Object.freeze({ required: ["eventId", "tenantId", "deviceId", "eventType", "occurredAt", "payload", "status"], optional: ["branchId", "userId", "sequence", "fingerprint", "receivedAt", "processedAt", "replayPhase", "error"] });
export const OFFLINE_EVENT_STATUSES = Object.freeze(["PENDING", "APPLIED", "REJECTED", "CONFLICT"]);
