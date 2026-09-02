import express from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { createSaleController, listSalesController } from "../controllers/salesController.js";

const router = express.Router();
router.use(requireAuth);
router.get("/sales", listSalesController);
router.post("/sales", requireRole("admin", "manager", "staff"), createSaleController);
export default router;
