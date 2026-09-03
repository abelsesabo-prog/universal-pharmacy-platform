import express from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { requireTenant } from "../middleware/tenant.js";
import { requireRoleOrDelegation } from "../middleware/delegation.js";
import { createFinancialEntryController, listFinancialEntriesController, reconcilePaymentMethodsController } from "../controllers/financialController.js";
import { postJournalController, listJournalsController, trialBalanceController } from "../controllers/ledgerController.js";

const router = express.Router();

const requireFinanceContext = [requireAuth, requireTenant];

router.get("/finance/entries", ...requireFinanceContext, listFinancialEntriesController);
router.post("/finance/entries", ...requireFinanceContext, requireRoleOrDelegation("FINANCIAL_POSTING", ["admin", "manager"]), createFinancialEntryController);
router.get("/finance/reconciliation", ...requireFinanceContext, requireRole("admin", "manager"), reconcilePaymentMethodsController);

// Canonical double-entry ledger. Posting remains manager/admin controlled or explicitly delegated.
router.post("/finance/journals", ...requireFinanceContext, requireRoleOrDelegation("FINANCIAL_POSTING", ["admin", "manager"]), postJournalController);
router.get("/finance/journals", ...requireFinanceContext, requireRole("admin", "manager"), listJournalsController);
router.get("/finance/trial-balance", ...requireFinanceContext, requireRole("admin", "manager"), trialBalanceController);

export default router;
