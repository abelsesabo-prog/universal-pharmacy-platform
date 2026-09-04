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

export function canonicalProductIdentity(product) {
    return [
        product.brandName,
        product.genericName,
        product.manufacturer || "Unspecified",
        product.dosageForm || "Unspecified",
        canonicalStrength(product.strength),
        product.packSize || "Unspecified"
    ].map(canonicalProductText).join("|");
}

export function invoiceProductIdentity(row) {
    return canonicalProductIdentity({
        brandName: row.brandName,
        genericName: row.genericName,
        manufacturer: row.manufacturer,
        dosageForm: row.dosageForm,
        strength: row.strength,
        packSize: row.packSize
    });
}

export function buildProductIdentityKey(product) {
    return invoiceProductIdentity(product);
}

function escapeRegex(value) {
    return value.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\\\$&");
}

function tolerantRegex(value) {
    const tokens = canonicalProductText(value).split(" ").filter(Boolean);
    if (!tokens.length) return null;
    return new RegExp(tokens.map(escapeRegex).join("[^a-z0-9]*"), "i");
}

export async function resolveExistingInvoiceProduct(row, tenantId, session = undefined) {
    const products = getCollection(COLLECTIONS.PRODUCTS);
    const options = session ? { session } : undefined;
    const barcode = text(row.barcode);
    if (barcode) {
        return products.findOne({ tenantId, barcode }, options);
    }

    const brand = canonicalProductText(row.brandName);
    const generic = canonicalProductText(row.genericName);
    const manufacturer = canonicalProductText(row.manufacturer || "Unspecified");
    const dosage = canonicalProductText(row.dosageForm || "Unspecified");
    const strength = canonicalStrength(row.strength);
    const packSize = canonicalProductText(row.packSize || "Unspecified");

    if (!brand && !generic) return null;

    const anchors = [brand, generic].filter(Boolean).map(tolerantRegex).filter(Boolean);
    const candidates = await products.find({
        tenantId,
        $or: [
            { brandName: { $in: anchors } },
            { genericName: { $in: anchors } }
        ]
    }, options).limit(50).toArray();

    const target = [brand, generic, manufacturer, dosage, strength, packSize].join("|");
    return candidates.find(product => canonicalProductIdentity(product) === target) || null;
}