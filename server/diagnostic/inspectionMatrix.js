// ==========================================
// Universal Pharmacy Platform
// Inspector Intelligence
// Machine-Readable Inspection Matrix
// ==========================================


export const VERDICTS = Object.freeze({

    BUILT:
        "BUILT",

    PARTIAL:
        "PARTIAL",

    PLANNED:
        "PLANNED",

    MISSING:
        "MISSING",

    BROKEN:
        "BROKEN",

    UNKNOWN:
        "UNKNOWN",

    NOT_APPLICABLE:
        "NOT_APPLICABLE"
});


export const EVIDENCE_TYPES = Object.freeze({

    STRUCTURAL:
        "STRUCTURAL",

    STATIC:
        "STATIC",

    RUNTIME:
        "RUNTIME",

    CONSTITUTIONAL:
        "CONSTITUTIONAL"
});


export const CONFIDENCE_LEVELS = Object.freeze({

    HIGH:
        "HIGH",

    MEDIUM:
        "MEDIUM",

    LOW:
        "LOW",

    NONE:
        "NONE"
});


export const SYSTEM_PROFILES = Object.freeze({

    UNIVERSAL:
        "universal",

    PHARMACY:
        "pharmacy",

    RETAIL:
        "retail",

    WAREHOUSE:
        "warehouse",

    HOSPITAL:
        "hospital",

    FINANCIAL:
        "financial",

    CUSTOM:
        "custom"
});


export const PRIORITIES = Object.freeze({

    CRITICAL:
        "critical",

    HIGH:
        "high",

    MEDIUM:
        "medium",

    LOW:
        "low"
});


export const INSPECTION_MATRIX = [

    // ======================================
    // CORE ARCHITECTURE
    // ======================================

    {
        id:
            "architecture.module-separation",

        domain:
            "architecture",

        title:
            "Modular Architecture Separation",

        expectation:
            "The system must separate major responsibilities into meaningful architectural layers.",

        appliesTo: [
            SYSTEM_PROFILES.UNIVERSAL,
            SYSTEM_PROFILES.PHARMACY,
            SYSTEM_PROFILES.RETAIL,
            SYSTEM_PROFILES.WAREHOUSE,
            SYSTEM_PROFILES.HOSPITAL,
            SYSTEM_PROFILES.FINANCIAL,
            SYSTEM_PROFILES.CUSTOM
        ],

        priority:
            PRIORITIES.CRITICAL,

        requiredEvidence: [
            EVIDENCE_TYPES.STRUCTURAL,
            EVIDENCE_TYPES.STATIC
        ],

        evidenceTargets: {

            directories: [
                "server/routes",
                "server/controllers",
                "server/services"
            ],

            relationships: [
                "route-to-controller",
                "controller-to-service"
            ]
        }
    },


    {
        id:
            "architecture.dependency-integrity",

        domain:
            "architecture",

        title:
            "Dependency Integrity",

        expectation:
            "Core modules must not depend on unresolved local modules or dangerous dependency cycles.",

        appliesTo: [
            SYSTEM_PROFILES.UNIVERSAL,
            SYSTEM_PROFILES.PHARMACY,
            SYSTEM_PROFILES.RETAIL,
            SYSTEM_PROFILES.WAREHOUSE,
            SYSTEM_PROFILES.HOSPITAL,
            SYSTEM_PROFILES.FINANCIAL,
            SYSTEM_PROFILES.CUSTOM
        ],

        priority:
            PRIORITIES.CRITICAL,

        requiredEvidence: [
            EVIDENCE_TYPES.STATIC
        ],

        evidenceTargets: {

            checks: [
                "unresolved-imports",
                "dependency-cycles",
                "import-export-compatibility"
            ]
        }
    },


    // ======================================
    // PRODUCT INTELLIGENCE
    // ======================================

    {
        id:
            "product.identity-management",

        domain:
            "product",

        title:
            "Product Identity Management",

        expectation:
            "Products must support meaningful identity and classification information.",

        appliesTo: [
            SYSTEM_PROFILES.PHARMACY,
            SYSTEM_PROFILES.RETAIL,
            SYSTEM_PROFILES.WAREHOUSE
        ],

        priority:
            PRIORITIES.HIGH,

        requiredEvidence: [
            EVIDENCE_TYPES.STRUCTURAL,
            EVIDENCE_TYPES.STATIC
        ],

        evidenceTargets: {

            modules: [
                "server/services/productService.js",
                "server/controllers/productController.js",
                "server/routes/productRoutes.js"
            ],

            expectedFields: [
                "brandName",
                "genericName",
                "dosageForm",
                "category"
            ]
        }
    },


    {
        id:
            "product.identification-extensions",

        domain:
            "product",

        title:
            "Extended Product Identification",

        expectation:
            "Products should support additional identifiers and metadata where required by the domain.",

        appliesTo: [
            SYSTEM_PROFILES.PHARMACY,
            SYSTEM_PROFILES.RETAIL
        ],

        priority:
            PRIORITIES.MEDIUM,

        requiredEvidence: [
            EVIDENCE_TYPES.STATIC
        ],

        evidenceTargets: {

            expectedFields: [
                "manufacturer",
                "registrationAgency",
                "registrationNumber",
                "barcode"
            ]
        }
    },


    // ======================================
    // BATCH INTELLIGENCE
    // ======================================

    {
        id:
            "batch.product-linkage",

        domain:
            "batch",

        title:
            "Batch Product Integrity",

        expectation:
            "Every batch must belong to a valid product and product-to-batch relationships must be protected.",

        appliesTo: [
            SYSTEM_PROFILES.PHARMACY,
            SYSTEM_PROFILES.WAREHOUSE,
            SYSTEM_PROFILES.RETAIL
        ],

        priority:
            PRIORITIES.CRITICAL,

        requiredEvidence: [
            EVIDENCE_TYPES.STATIC,
            EVIDENCE_TYPES.RUNTIME
        ],

        evidenceTargets: {

            modules: [
                "server/services/batchService.js"
            ],

            runtimeAssertions: [
                "invalid-product-id-rejected",
                "missing-product-rejected",
                "product-batch-integrity-enforced"
            ]
        }
    },


    {
        id:
            "batch.expiry-tracking",

        domain:
            "batch",

        title:
            "Batch Expiry Tracking",

        expectation:
            "Batch records must support expiry tracking.",

        appliesTo: [
            SYSTEM_PROFILES.PHARMACY,
            SYSTEM_PROFILES.WAREHOUSE
        ],

        priority:
            PRIORITIES.CRITICAL,

        requiredEvidence: [
            EVIDENCE_TYPES.STRUCTURAL,
            EVIDENCE_TYPES.STATIC
        ],

        evidenceTargets: {

            expectedFields: [
                "batchNumber",
                "quantity",
                "expiryDate"
            ]
        }
    },


    {
        id:
            "batch.financial-intelligence",

        domain:
            "batch",

        title:
            "Batch Cost and Selling Price Intelligence",

        expectation:
            "Batch records should preserve wholesale cost and selling price information.",

        appliesTo: [
            SYSTEM_PROFILES.PHARMACY,
            SYSTEM_PROFILES.RETAIL,
            SYSTEM_PROFILES.WAREHOUSE
        ],

        priority:
            PRIORITIES.HIGH,

        requiredEvidence: [
            EVIDENCE_TYPES.STATIC,
            EVIDENCE_TYPES.RUNTIME
        ],

        evidenceTargets: {

            expectedFields: [
                "costPrice",
                "sellingPrice"
            ]
        }
    },


    {
        id:
            "batch.location-management",

        domain:
            "batch",

        title:
            "Batch Storage Location",

        expectation:
            "Batch records should support physical or logical storage location tracking.",

        appliesTo: [
            SYSTEM_PROFILES.PHARMACY,
            SYSTEM_PROFILES.RETAIL,
            SYSTEM_PROFILES.WAREHOUSE
        ],

        priority:
            PRIORITIES.MEDIUM,

        requiredEvidence: [
            EVIDENCE_TYPES.STATIC
        ],

        evidenceTargets: {

            expectedFields: [
                "location"
            ]
        }
    },


    // ======================================
    // INVENTORY MOVEMENT
    // ======================================

    {
        id:
            "inventory.stock-movement.sale",

        domain:
            "inventory",

        title:
            "Sale Stock Deduction",

        expectation:
            "A sale must reduce stock from the correct batch.",

        appliesTo: [
            SYSTEM_PROFILES.PHARMACY,
            SYSTEM_PROFILES.RETAIL,
            SYSTEM_PROFILES.WAREHOUSE
        ],

        priority:
            PRIORITIES.CRITICAL,

        requiredEvidence: [
            EVIDENCE_TYPES.STATIC,
            EVIDENCE_TYPES.RUNTIME
        ],

        evidenceTargets: {

            movementType:
                "SALE",

            expectedDirection:
                "DECREASE"
        }
    },


    {
        id:
            "inventory.stock-movement.purchase",

        domain:
            "inventory",

        title:
            "Purchase Stock Increase",

        expectation:
            "A purchase movement must increase stock.",

        appliesTo: [
            SYSTEM_PROFILES.PHARMACY,
            SYSTEM_PROFILES.RETAIL,
            SYSTEM_PROFILES.WAREHOUSE
        ],

        priority:
            PRIORITIES.CRITICAL,

        requiredEvidence: [
            EVIDENCE_TYPES.STATIC,
            EVIDENCE_TYPES.RUNTIME
        ],

        evidenceTargets: {

            movementType:
                "PURCHASE",

            expectedDirection:
                "INCREASE"
        }
    },


    {
        id:
            "inventory.stock-movement.return",

        domain:
            "inventory",

        title:
            "Returned Stock Recovery",

        expectation:
            "A valid stock return must restore inventory.",

        appliesTo: [
            SYSTEM_PROFILES.PHARMACY,
            SYSTEM_PROFILES.RETAIL,
            SYSTEM_PROFILES.WAREHOUSE
        ],

        priority:
            PRIORITIES.HIGH,

        requiredEvidence: [
            EVIDENCE_TYPES.STATIC,
            EVIDENCE_TYPES.RUNTIME
        ],

        evidenceTargets: {

            movementType:
                "RETURN",

            expectedDirection:
                "INCREASE"
        }
    },


    {
        id:
            "inventory.stock-movement.damage",

        domain:
            "inventory",

        title:
            "Damaged Stock Removal",

        expectation:
            "Damaged stock must be removed from available inventory through an auditable movement.",

        appliesTo: [
            SYSTEM_PROFILES.PHARMACY,
            SYSTEM_PROFILES.RETAIL,
            SYSTEM_PROFILES.WAREHOUSE
        ],

        priority:
            PRIORITIES.HIGH,

        requiredEvidence: [
            EVIDENCE_TYPES.STATIC,
            EVIDENCE_TYPES.RUNTIME
        ],

        evidenceTargets: {

            movementType:
                "DAMAGE",

            expectedDirection:
                "DECREASE"
        }
    },


    {
        id:
            "inventory.stock-movement.expired",

        domain:
            "inventory",

        title:
            "Expired Stock Removal",

        expectation:
            "Expired stock must be removable from available inventory through a controlled movement.",

        appliesTo: [
            SYSTEM_PROFILES.PHARMACY,
            SYSTEM_PROFILES.WAREHOUSE
        ],

        priority:
            PRIORITIES.CRITICAL,

        requiredEvidence: [
            EVIDENCE_TYPES.STATIC,
            EVIDENCE_TYPES.RUNTIME
        ],

        evidenceTargets: {

            movementType:
                "EXPIRED",

            expectedDirection:
                "DECREASE"
        }
    },


    {
        id:
            "inventory.stock-movement.transfer",

        domain:
            "inventory",

        title:
            "Inventory Transfer",

        expectation:
            "Inventory transfer logic must support both inward and outward stock movement.",

        appliesTo: [
            SYSTEM_PROFILES.PHARMACY,
            SYSTEM_PROFILES.RETAIL,
            SYSTEM_PROFILES.WAREHOUSE
        ],

        priority:
            PRIORITIES.HIGH,

        requiredEvidence: [
            EVIDENCE_TYPES.STATIC,
            EVIDENCE_TYPES.RUNTIME
        ],

        evidenceTargets: {

            movementTypes: [
                "TRANSFER_IN",
                "TRANSFER_OUT"
            ]
        }
    },


    {
        id:
            "inventory.stock-protection.oversale",

        domain:
            "inventory",

        title:
            "Oversale Protection",

        expectation:
            "The system must reject stock movements that would create negative inventory.",

        appliesTo: [
            SYSTEM_PROFILES.PHARMACY,
            SYSTEM_PROFILES.RETAIL,
            SYSTEM_PROFILES.WAREHOUSE
        ],

        priority:
            PRIORITIES.CRITICAL,

        requiredEvidence: [
            EVIDENCE_TYPES.STATIC,
            EVIDENCE_TYPES.RUNTIME
        ],

        evidenceTargets: {

            runtimeAssertions: [
                "oversale-rejected",
                "negative-stock-prevented"
            ]
        }
    },


    {
        id:
            "inventory.stock-protection.quantity",

        domain:
            "inventory",

        title:
            "Positive Movement Quantity Validation",

        expectation:
            "Stock movement quantities must be greater than zero.",

        appliesTo: [
            SYSTEM_PROFILES.PHARMACY,
            SYSTEM_PROFILES.RETAIL,
            SYSTEM_PROFILES.WAREHOUSE
        ],

        priority:
            PRIORITIES.HIGH,

        requiredEvidence: [
            EVIDENCE_TYPES.STATIC,
            EVIDENCE_TYPES.RUNTIME
        ],

        evidenceTargets: {

            runtimeAssertions: [
                "negative-quantity-rejected",
                "zero-quantity-rejected"
            ]
        }
    },


    {
        id:
            "inventory.stock-movement.adjustment",

        domain:
            "inventory",

        title:
            "Controlled Inventory Adjustment",

        expectation:
            "Inventory adjustments must use explicit and controlled adjustment logic.",

        appliesTo: [
            SYSTEM_PROFILES.PHARMACY,
            SYSTEM_PROFILES.RETAIL,
            SYSTEM_PROFILES.WAREHOUSE
        ],

        priority:
            PRIORITIES.HIGH,

        requiredEvidence: [
            EVIDENCE_TYPES.STATIC,
            EVIDENCE_TYPES.RUNTIME
        ],

        evidenceTargets: {

            movementType:
                "ADJUSTMENT",

            expectedControls: [
                "explicit-adjustment-semantics",
                "reason",
                "audit-trail",
                "quantity-validation"
            ]
        }
    }
];


export function getInspectionCapabilities(
    profile = SYSTEM_PROFILES.UNIVERSAL
) {

    return INSPECTION_MATRIX.filter(
        (capability) =>
            capability.appliesTo.includes(profile) ||
            capability.appliesTo.includes(
                SYSTEM_PROFILES.UNIVERSAL
            )
    );
}


export function getCapabilityById(
    capabilityId
) {

    return INSPECTION_MATRIX.find(
        (capability) =>
            capability.id === capabilityId
    ) || null;
}


export function getCapabilitiesByDomain(
    domain
) {

    return INSPECTION_MATRIX.filter(
        (capability) =>
            capability.domain === domain
    );
}


export default INSPECTION_MATRIX;