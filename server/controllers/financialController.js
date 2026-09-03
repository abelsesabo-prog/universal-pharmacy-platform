import { createFinancialEntry, listFinancialEntries, reconcilePaymentMethods } from "../services/financialService.js";
import { recordAudit } from "../services/auditService.js";

export async function createFinancialEntryController(req, res, next) {
    try {
        const entry = await createFinancialEntry({ tenantId: req.user.tenantId, branchId: req.body.branchId, account: req.body.account, direction: req.body.direction, amount: req.body.amount, paymentMethod: req.body.paymentMethod, referenceType: req.body.referenceType, referenceId: req.body.referenceId, description: req.body.description, occurredAt: req.body.occurredAt });
        try { await recordAudit({ tenantId: req.user.tenantId, actorId: req.user.sub, action: "FINANCIAL_ENTRY_CREATED", resource: "financial_entry", resourceId: entry._id, details: { account: entry.account, direction: entry.direction, amount: entry.amount, paymentMethod: entry.paymentMethod }, requestId: req.id }); } catch (error) { console.error("Audit log write failed:", error.message); }
        return res.status(201).json({ success: true, entry });
    } catch (error) { return next(error); }
}

export async function listFinancialEntriesController(req, res, next) {
    try { const entries = await listFinancialEntries({ tenantId: req.user.tenantId, branchId: req.query.branchId, limit: req.query.limit, skip: req.query.skip }); return res.json({ success: true, count: entries.length, entries }); }
    catch (error) { return next(error); }
}

export async function reconcilePaymentMethodsController(req, res, next) {
    try { return res.json({ success: true, reconciliation: await reconcilePaymentMethods({ tenantId: req.user.tenantId, branchId: req.query.branchId, from: req.query.from, to: req.query.to }) }); }
    catch (error) { return next(error); }
}
