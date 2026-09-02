// ==========================================
// Universal Pharmacy Platform
// Product Controller
// ==========================================

import {
    createProduct,
    getProductById,
    updateProduct,
    deleteProduct,
    listProducts
} from "../services/productService.js";

export async function createProductController(req, res) {
    try {
        const product = await createProduct(req.body, req.tenantId);
        res.status(201).json({ success: true, product });
    } catch (error) {
        const statusCode = error.statusCode || 500;
        res.status(statusCode).json({ success: false, error: error.message });
    }
}

export async function getProductController(req, res) {
    try {
        const product = await getProductById(req.params.id, req.tenantId);

        if (!product) {
            return res.status(404).json({ success: false, error: "Product not found." });
        }

        res.status(200).json({ success: true, product });
    } catch (error) {
        const statusCode = error.statusCode || 500;
        res.status(statusCode).json({ success: false, error: error.message });
    }
}

export async function updateProductController(req, res) {
    try {
        const product = await updateProduct(req.params.id, req.body, req.tenantId);
        res.status(200).json({ success: true, product });
    } catch (error) {
        const statusCode = error.statusCode || 500;
        res.status(statusCode).json({ success: false, error: error.message });
    }
}

export async function deleteProductController(req, res) {
    try {
        const result = await deleteProduct(req.params.id, req.tenantId);
        res.status(200).json({ success: true, ...result });
    } catch (error) {
        const statusCode = error.statusCode || 500;
        res.status(statusCode).json({ success: false, error: error.message });
    }
}

export async function listProductsController(req, res) {
    try {
        const products = await listProducts({
            limit: req.query.limit,
            skip: req.query.skip
        }, req.tenantId);

        res.status(200).json({ success: true, count: products.length, products });
    } catch (error) {
        const statusCode = error.statusCode || 500;
        res.status(statusCode).json({ success: false, error: error.message });
    }
}
