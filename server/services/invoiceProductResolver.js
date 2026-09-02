import { getCollection } from "./index.js";
import { COLLECTIONS } from "../../shared/schemas/index.js";

function text(value) {
    return String(value ?? "").normalize("NFKC").trim();
}

export function canonicalProductText(value) {
    return text(value)
        .toLowerCase()
        .replace(/[’'`]/g, "")
        .replace(/[^a-z0-9]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function canonicalStrength(value) {
    return canonicalProductText(value).replace(/\s+/g, "");
}

function canonicalProduct(product) {
    return [
        product.brandName,
        product.genericName,
        product.dosageForm,
        product.strength
    ].map(canonicalProductText).join("|");
}

function escapeRegex(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function resolveExistingInvoiceProduct(row, tenantId) {
    const products = getCollection(COLLECTIONS.PRODUCTS);
    const barcode = text(row.barcode);
    if (barcode) {
        return products.findOne({ tenantId, barcode });
    }

    const brand = canonicalProductText(row.brandName);
    const generic = canonicalProductText(row.genericName);
    const dosage = canonicalProductText(row.dosageForm || "Unspecified");
    const strength = canonicalStrength(row.strength);

    if (!brand && !generic) return null;

    const anchors = [brand, generic].filter(Boolean).map(value => new RegExp(escapeRegex(value).replace(/ /g, "\\s+"), "i"));
    const candidates = await products.find({
        tenantId,
        $or: [
            { brandName: { $in: anchors } },
            { genericName: { $in: anchors } }
        ]
    }).limit(50).toArray();

    const target = [brand, generic, dosage, strength].join("|");
    return candidates.find(product => canonicalProduct(product) === target) || null;
}
