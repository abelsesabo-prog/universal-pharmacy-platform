// ==========================================
// Universal Pharmacy Platform
// Product Routes
// ==========================================

import express from "express";

import {
    createProductController,
    getProductController,
    listProductsController
} from "../controllers/productController.js";

const router = express.Router();

router.post("/", createProductController);
router.get("/", listProductsController);
router.get("/:id", getProductController);

export default router;
