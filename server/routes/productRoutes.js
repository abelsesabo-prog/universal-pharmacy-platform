// ==========================================
// Universal Pharmacy Platform
// Product Routes
// ==========================================

import express from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { requireTenant } from "../middleware/tenant.js";

import {
    createProductController,
    getProductController,
    updateProductController,
    deleteProductController,
    listProductsController
} from "../controllers/productController.js";

const router = express.Router();

// Product operations require both an authenticated identity and tenant context.
router.use(requireAuth, requireTenant);

router.post("/", requireRole("admin", "manager"), createProductController);
router.get("/", listProductsController);
router.get("/:id", getProductController);
router.patch("/:id", requireRole("admin", "manager"), updateProductController);
router.delete("/:id", requireRole("admin"), deleteProductController);

export default router;
