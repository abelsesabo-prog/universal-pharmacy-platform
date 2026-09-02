import express from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { createBatchController, listBatchesController, listStockMovementsController, adjustStockController } from "../controllers/inventoryController.js";

const router = express.Router();
router.use(requireAuth);
router.get("/batches", listBatchesController);
router.post("/batches", requireRole("admin", "manager"), createBatchController);
router.get("/stock-movements", listStockMovementsController);
router.post("/stock-movements", requireRole("admin", "manager"), adjustStockController);
export default router;
