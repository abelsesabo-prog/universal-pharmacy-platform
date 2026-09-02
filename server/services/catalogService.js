// ==========================================
// Universal Pharmacy Platform
// Universal Medicine Catalog Service
// ==========================================
// Uses public RxNorm/RxNav data for discovery and autocomplete.
// NLM attribution: "This product uses publicly available data from
// the U.S. National Library of Medicine (NLM), National Institutes
// of Health, Department of Health and Human Services; NLM is not
// responsible for the product and does not endorse or recommend
// this or any other product."

import { COLLECTIONS } from "../../shared/schemas/index.js";
import { getCollection } from "./index.js";

const RXNAV_BASE = "https://rxnav.nlm.nih.gov/REST";
const DISPLAY_NAMES_URL = `${RXNAV_BASE}/displaynames.json`;
const DISPLAY_CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const MAX_RESULTS = 100;

let displayCache = null;
let displayCacheLoadedAt = 0;

function normalize(value) {
    return String(value || "")
        .normalize("NFKC")
        .trim()
        .toLowerCase();
}

async function fetchJson(url) {
    const response = await fetch(url, {
        headers: { accept: "application/json" },
        signal: AbortSignal.timeout(8000)
    });

    if (!response.ok) {
        const error = new Error(`Catalog provider returned HTTP ${response.status}.`);
        error.statusCode = 502;
        throw error;
    }

    return response.json();
}

async function loadDisplayNames() {
    if (displayCache && Date.now() - displayCacheLoadedAt < DISPLAY_CACHE_TTL_MS) {
        return displayCache;
    }

    const payload = await fetchJson(DISPLAY_NAMES_URL);
    const names = Array.isArray(payload?.displayTerms?.term)
        ? payload.displayTerms.term
        : [];

    displayCache = [...new Set(names.map(value => String(value).trim()).filter(Boolean))]
        .sort((a, b) => a.localeCompare(b));
    displayCacheLoadedAt = Date.now();
    return displayCache;
}

export async function searchCatalog(query, limit = 50) {
    const q = normalize(query);
    if (!q) return [];

    const names = await loadDisplayNames();
    const cappedLimit = Math.min(Math.max(Number(limit) || 50, 1), MAX_RESULTS);

    return names
        .filter(name => normalize(name).startsWith(q))
        .slice(0, cappedLimit)
        .map(name => ({ name }));
}

async function resolveDrugName(name) {
    const encoded = encodeURIComponent(String(name || "").trim());
    if (!encoded) return { concepts: [], source: "rxnorm" };

    const payload = await fetchJson(`${RXNAV_BASE}/drugs.json?name=${encoded}`);
    const groups = Array.isArray(payload?.drugGroup?.conceptGroup)
        ? payload.drugGroup.conceptGroup
        : [];

    const concepts = [];
    for (const group of groups) {
        const tty = String(group.tty || "");
        for (const concept of Array.isArray(group.conceptProperties) ? group.conceptProperties : []) {
            concepts.push({
                rxcui: concept.rxcui,
                name: concept.name,
                tty,
                generic: tty === "SCD" || tty === "GPCK",
                branded: tty === "SBD" || tty === "BPCK"
            });
        }
    }

    return { concepts, source: "rxnorm" };
}

export async function resolveCatalogItem(name) {
    const result = await resolveDrugName(name);
    const generics = result.concepts.filter(item => item.generic);
    const brands = result.concepts.filter(item => item.branded);

    return {
        source: result.source,
        query: String(name).trim(),
        generics,
        brands
    };
}

export async function installCatalogFamily({ tenantId, name, category = "Medicine" }) {
    const scopedTenantId = String(tenantId || "").trim();
    if (!scopedTenantId) {
        const error = new Error("Tenant context is required.");
        error.statusCode = 403;
        throw error;
    }

    const resolved = await resolveCatalogItem(name);
    const genericNames = [...new Set(resolved.generics.map(item => item.name))];
    const brandNames = [...new Set(resolved.brands.map(item => item.name))];
    const primaryGeneric = genericNames[0] || String(name).trim();

    if (!primaryGeneric && brandNames.length === 0) {
        const error = new Error("No catalog product was resolved.");
        error.statusCode = 404;
        throw error;
    }

    const products = getCollection(COLLECTIONS.PRODUCTS);
    const familyId = `RXNORM:${normalize(primaryGeneric)}`;
    const namesToInstall = brandNames.length > 0 ? brandNames.slice(0, 50) : [primaryGeneric];
    const installed = [];

    for (const brandName of namesToInstall) {
        const existing = await products.findOne({
            tenantId: scopedTenantId,
            brandName,
            genericName: primaryGeneric
        });

        if (existing) {
            installed.push({ ...existing, alreadyInstalled: true });
            continue;
        }

        const product = {
            tenantId: scopedTenantId,
            brandName,
            genericName: primaryGeneric,
            // Catalog discovery does not invent clinical details. The user fills
            // dosage form/strength/pack details when real stock is received.
            dosageForm: "Unspecified",
            category: String(category).trim() || "Medicine",
            strength: null,
            strengthUnit: null,
            manufacturer: null,
            registrationAgency: null,
            registrationNumber: null,
            baseUnit: null,
            uomMatrix: null,
            barcode: null,
            stockQuantity: 0,
            catalogInstalled: true,
            catalogSource: "RxNorm",
            catalogFamilyId: familyId,
            catalogRxcui: resolved.brands.find(item => item.name === brandName)?.rxcui || null,
            createdAt: new Date(),
            updatedAt: new Date()
        };

        const result = await products.insertOne(product);
        installed.push({ ...product, _id: result.insertedId, alreadyInstalled: false });
    }

    return {
        source: "RxNorm",
        familyId,
        genericName: primaryGeneric,
        availableGenerics: genericNames,
        availableBrands: brandNames,
        installedCount: installed.filter(item => !item.alreadyInstalled).length,
        alreadyInstalledCount: installed.filter(item => item.alreadyInstalled).length,
        products: installed
    };
}
