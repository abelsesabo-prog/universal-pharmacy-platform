import express from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { ensureChartOfAccounts, createAccount, listAccounts, trialBalanceDetailed, incomeStatement, balanceSheet, reconcileLedger, closeAccountingPeriod, listAccountingPeriods } from "../services/accountingCompletionService.js";

const router = express.Router();
const adminManager = [requireAuth, requireRole("admin", "manager")];

router.get("/accounting/accounts", ...adminManager, async (req, res, next) => {
    try { return res.json({ success: true, accounts: await listAccounts(req.user.tenantId, { activeOnly: req.query.activeOnly === "true" }) }); } catch (error) { next(error); }
});

router.post("/accounting/accounts/seed", requireAuth, requireRole("admin"), async (req, res, next) => {
    try { return res.status(201).json({ success: true, accounts: await ensureChartOfAccounts(req.user.tenantId) }); } catch (error) { next(error); }
});

router.post("/accounting/accounts", requireAuth, requireRole("admin"), async (req, res, next) => {
    try { return res.status(201).json({ success: true, account: await createAccount(req.user.tenantId, req.body) }); } catch (error) { next(error); }
});

router.get("/accounting/trial-balance", ...adminManager, async (req, res, next) => {
    try { return res.json({ success: true, report: await trialBalanceDetailed({ tenantId: req.user.tenantId, branchId: req.query.branchId, currency: req.query.currency, from: req.query.from, to: req.query.to }) }); } catch (error) { next(error); }
});

router.get("/accounting/income-statement", ...adminManager, async (req, res, next) => {
    try { return res.json({ success: true, report: await incomeStatement({ tenantId: req.user.tenantId, branchId: req.query.branchId, currency: req.query.currency, from: req.query.from, to: req.query.to }) }); } catch (error) { next(error); }
});

router.get("/accounting/balance-sheet", ...adminManager, async (req, res, next) => {
    try { return res.json({ success: true, report: await balanceSheet({ tenantId: req.user.tenantId, branchId: req.query.branchId, currency: req.query.currency, to: req.query.to }) }); } catch (error) { next(error); }
});

router.get("/accounting/reconciliation", ...adminManager, async (req, res, next) => {
    try { return res.json({ success: true, reconciliation: await reconcileLedger({ tenantId: req.user.tenantId, branchId: req.query.branchId, currency: req.query.currency, from: req.query.from, to: req.query.to }) }); } catch (error) { next(error); }
});

router.get("/accounting/periods", ...adminManager, async (req, res, next) => {
    try { return res.json({ success: true, periods: await listAccountingPeriods(req.user.tenantId) }); } catch (error) { next(error); }
});

router.post("/accounting/periods/close", requireAuth, requireRole("admin"), async (req, res, next) => {
    try { return res.status(201).json({ success: true, period: await closeAccountingPeriod(req.user.tenantId, { ...req.body, closedBy: req.user.sub }) }); } catch (error) { next(error); }
});

export default router;
