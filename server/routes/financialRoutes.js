import express from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { createFinancialEntryController, listFinancialEntriesController, reconcilePaymentMethodsController } from "../controllers/financialController.js";

const router = express.Router();
router.use(requireAuth);
router.get("/finance/entries", listFinancialEntriesController);
router.post("/finance/entries", requireRole("admin", "manager"), createFinancialEntryController);
router.get("/finance/reconciliation", requireRole("admin", "manager"), reconcilePaymentMethodsController);
export default router;
