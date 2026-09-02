import { createProduct, getProductById, updateProduct, deleteProduct, listProducts } from "../services/productService.js";
import { recordAudit } from "../services/auditService.js";

export async function createProductController(req, res) {
    try {
        const product = await createProduct(req.body, req.tenantId);
        await recordAudit({ tenantId: req.tenantId, actorId: req.user?.sub || req.user?.userId, action: "CREATE", resource: "product", resourceId: product._id, details: { brandName: product.brandName, genericName: product.genericName }, requestId: req.id });
        return res.status(201).json({ success: true, product });
    } catch (error) { const statusCode = error.statusCode || 500; return res.status(statusCode).json({ success: false, error: error.message }); }
}

export async function getProductController(req, res) {
    try {
        const product = await getProductById(req.params.id, req.tenantId);
        if (!product) return res.status(404).json({ success: false, error: "Product not found." });
        return res.status(200).json({ success: true, product });
    } catch (error) { const statusCode = error.statusCode || 500; return res.status(statusCode).json({ success: false, error: error.message }); }
}

export async function updateProductController(req, res) {
    try {
        const product = await updateProduct(req.params.id, req.body, req.tenantId);
        await recordAudit({ tenantId: req.tenantId, actorId: req.user?.sub || req.user?.userId, action: "UPDATE", resource: "product", resourceId: product._id, details: { fields: Object.keys(req.body || {}) }, requestId: req.id });
        return res.status(200).json({ success: true, product });
    } catch (error) { const statusCode = error.statusCode || 500; return res.status(statusCode).json({ success: false, error: error.message }); }
}

export async function deleteProductController(req, res) {
    try {
        const result = await deleteProduct(req.params.id, req.tenantId);
        await recordAudit({ tenantId: req.tenantId, actorId: req.user?.sub || req.user?.userId, action: "DELETE", resource: "product", resourceId: req.params.id, details: { brandName: result.product?.brandName, genericName: result.product?.genericName }, requestId: req.id });
        return res.status(200).json({ success: true, ...result });
    } catch (error) { const statusCode = error.statusCode || 500; return res.status(statusCode).json({ success: false, error: error.message }); }
}

export async function listProductsController(req, res) {
    try {
        const products = await listProducts({ limit: req.query.limit, skip: req.query.skip }, req.tenantId);
        return res.status(200).json({ success: true, count: products.length, products });
    } catch (error) { const statusCode = error.statusCode || 500; return res.status(statusCode).json({ success: false, error: error.message }); }
}
