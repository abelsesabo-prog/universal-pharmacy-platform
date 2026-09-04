import express from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { createBatchController, listBatchesController, listStockMovementsController, adjustStockController } from "../controllers/inventoryController.js";

const router = express.Router();

// Authentication is scoped to declared inventory endpoints so unknown /api routes can reach the terminal 404 handler.
router.get("/batches", requireAuth, listBatchesController);
router.post("/batches", requireAuth, requireRole("admin", "manager"), createBatchController);
router.get("/stock-movements", requireAuth, listStockMovementsController);
router.post("/stock-movements", requireAuth, requireRole("admin", "manager"), adjustStockController);

export default router;
