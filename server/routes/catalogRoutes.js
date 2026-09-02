import express from "express";
import {
    installCatalogController,
    resolveCatalogController,
    searchCatalogController
} from "../controllers/catalogController.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = express.Router();

// Fast discovery is authenticated but read-only.
router.get("/search", requireAuth, searchCatalogController);
router.get("/resolve", requireAuth, resolveCatalogController);

// Installation creates zero-stock catalog products for the current tenant.
router.post("/install", requireAuth, requireRole("admin", "manager"), installCatalogController);

export default router;
