import { createSale, listSales } from "../services/salesService.js";
import { recordAudit } from "../services/auditService.js";

export async function createSaleController(req, res, next) {
    try {
        const idempotencyKey = req.get("Idempotency-Key") || req.body?.idempotencyKey || req.id;
        const sale = await createSale({ tenantId: req.user.tenantId, cashierId: req.user.sub, ...req.body, idempotencyKey });
        try { await recordAudit({ tenantId: req.user.tenantId, actorId: req.user.sub, action: "SALE", resource: "sale", resourceId: sale._id, details: { total: sale.total, branchId: sale.branchId, ledgerJournalId: sale.ledgerJournalId }, requestId: req.id }); } catch (error) { console.error("Audit log write failed:", error.message); }
        return res.status(201).json({ success: true, sale });
    } catch (error) { return next(error); }
}

export async function listSalesController(req, res, next) {
    try { const sales = await listSales({ tenantId: req.user.tenantId, branchId: req.query.branchId, limit: req.query.limit, skip: req.query.skip }); return res.json({ success: true, count: sales.length, sales }); }
    catch (error) { return next(error); }
}
