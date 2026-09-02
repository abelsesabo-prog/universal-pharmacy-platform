// ==========================================
// Universal Pharmacy Platform
// Catalog Controller
// ==========================================
import { installCatalogFamily, resolveCatalogItem, searchCatalog } from "../services/catalogService.js";

export async function searchCatalogController(req, res, next) {
    try {
        const results = await searchCatalog(req.query.q, req.query.limit);
        return res.json({ query: String(req.query.q || "").trim(), results });
    } catch (error) {
        return next(error);
    }
}

export async function resolveCatalogController(req, res, next) {
    try {
        const result = await resolveCatalogItem(req.query.name);
        return res.json(result);
    } catch (error) {
        return next(error);
    }
}

export async function installCatalogController(req, res, next) {
    try {
        const result = await installCatalogFamily({
            tenantId: req.user.tenantId,
            name: req.body?.name,
            category: req.body?.category
        });
        return res.status(201).json(result);
    } catch (error) {
        return next(error);
    }
}
