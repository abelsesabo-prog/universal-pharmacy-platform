// Universal Multi-Tenant Business Optimization Engine
// Human-system architecture contract.
// The analogy is implemented as a dependency map, not as decorative terminology.

export const HUMAN_SYSTEM_LAYERS = Object.freeze({
    BODY: "body",
    SYSTEM: "system",
    ORGAN: "organ",
    TISSUE: "tissue",
    CELL: "cell"
});

export const HUMAN_SYSTEM_ANATOMY = Object.freeze([
    {
        id: "business-body",
        layer: HUMAN_SYSTEM_LAYERS.BODY,
        name: "Universal Business Body",
        purpose: "One multi-tenant platform containing coordinated business domains."
    },
    {
        id: "commercial-system",
        layer: HUMAN_SYSTEM_LAYERS.SYSTEM,
        name: "Commercial System",
        purpose: "Coordinates inventory, purchasing, selling, pricing and financial consequences."
    },
    {
        id: "pharmacy-organ",
        layer: HUMAN_SYSTEM_LAYERS.ORGAN,
        name: "Pharmacy Operations Organ",
        purpose: "Coordinates products, batches, UOM, stock, POS and regulated stock controls."
    },
    {
        id: "inventory-tissue",
        layer: HUMAN_SYSTEM_LAYERS.TISSUE,
        name: "Inventory Tissue",
        purpose: "Connects product identity, batch state, stock quantity, UOM and movements."
    },
    {
        id: "product-cell",
        layer: HUMAN_SYSTEM_LAYERS.CELL,
        name: "Product Identity Cell",
        purpose: "Owns canonical commercial identity while retaining generic grouping and brand variant identity."
    },
    {
        id: "financial-system",
        layer: HUMAN_SYSTEM_LAYERS.SYSTEM,
        name: "Financial System",
        purpose: "Coordinates sales, purchases, expenses, payment settlement, valuation and audit consequences."
    },
    {
        id: "clinical-system",
        layer: HUMAN_SYSTEM_LAYERS.SYSTEM,
        name: "Clinical System",
        purpose: "Reserved integration boundary for EHR, prescribing, laboratory and clinical safety organs."
    },
    {
        id: "governance-system",
        layer: HUMAN_SYSTEM_LAYERS.SYSTEM,
        name: "Governance System",
        purpose: "Security, tenancy, audit, delegation, compliance and operational controls."
    },
    {
        id: "reasoning-system",
        layer: HUMAN_SYSTEM_LAYERS.SYSTEM,
        name: "Reasoning System",
        purpose: "Provides explainable decisions and coordinates domain rules rather than duplicating domain state."
    }
]);

const REQUIRED_LAYERS = Object.freeze(Object.values(HUMAN_SYSTEM_LAYERS));

export function validateHumanSystemAnatomy(anatomy = HUMAN_SYSTEM_ANATOMY) {
    const errors = [];
    if (!Array.isArray(anatomy) || anatomy.length === 0) return { valid: false, errors: ["Human-system anatomy must contain at least one node."] };
    const ids = new Set();
    for (const node of anatomy) {
        if (!node?.id || !node?.layer || !node?.name || !node?.purpose) errors.push("Every anatomy node requires id, layer, name and purpose.");
        if (ids.has(node?.id)) errors.push(`Duplicate anatomy node: ${node.id}`);
        ids.add(node?.id);
    }
    for (const layer of REQUIRED_LAYERS) {
        if (!anatomy.some(node => node.layer === layer)) errors.push(`Missing human-system layer: ${layer}`);
    }
    return { valid: errors.length === 0, errors };
}

export function getHumanSystemAnatomy() {
    return HUMAN_SYSTEM_ANATOMY.map(node => ({ ...node }));
}
