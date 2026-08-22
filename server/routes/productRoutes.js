// ==========================================
// Universal Pharmacy Platform
// Product Routes
// ==========================================

import express from "express";

import {
    createProductController,
    getProductController,
    updateProductController,
    deleteProductController,
    listProductsController
} from "../controllers/productController.js";
const router = express.Router();

router.post("/", createProductController);
router.get("/", listProductsController);
router.get("/:id", getProductController);
router.patch("/:id", updateProductController);
router.delete("/:id", deleteProductController);
export default router;
