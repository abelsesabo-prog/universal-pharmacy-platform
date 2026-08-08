// ==========================================
// Universal Pharmacy Platform
// Product Controller
// ==========================================

import {
    createProduct,
    getProductById,
    listProducts
} from "../services/productService.js";

export async function createProductController(req, res) {
    try {
        const product = await createProduct(req.body);

        res.status(201).json({
            success: true,
            product
        });

    } catch (error) {
        const statusCode = error.statusCode || 500;

        res.status(statusCode).json({
            success: false,
            error: error.message
        });
    }
}

export async function getProductController(req, res) {
    try {
        const product = await getProductById(req.params.id);

        if (!product) {
            return res.status(404).json({
                success: false,
                error: "Product not found."
            });
        }

        res.status(200).json({
            success: true,
            product
        });

    } catch (error) {
        const statusCode = error.statusCode || 500;

        res.status(statusCode).json({
            success: false,
            error: error.message
        });
    }
}

export async function listProductsController(req, res) {
    try {
        const products = await listProducts({
            limit: req.query.limit,
            skip: req.query.skip
        });

        res.status(200).json({
            success: true,
            count: products.length,
            products
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
}