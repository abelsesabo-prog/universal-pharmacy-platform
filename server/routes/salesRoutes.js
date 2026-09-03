import express from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { createSaleController, listSalesController } from "../controllers/salesController.js";

const router = express.Router();

// Authentication is scoped to declared sales endpoints so unknown /api routes can reach the terminal 404 handler.
router.get("/sales", requireAuth, listSalesController);
router.post("/sales", requireAuth, requireRole("admin", "manager", "staff"), createSaleController);

export default router;
