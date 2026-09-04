import { receivePurchase, getPurchaseById } from "../services/purchaseService.js";
import { recordAudit } from "../services/auditService.js";

async function audit(req, data) {
    try { await recordAudit({ tenantId: req.tenantId, actorId: req.user?.sub || req.user?.userId, requestId: req.id, ...data }); }
    catch (error) { console.error("Audit log write failed:", error.message); }
}

export async function receivePurchaseController(req, res) {
    try {
        const result = await receivePurchase({ ...req.body, tenantId: req.tenantId, createdBy: req.user?.sub || req.user?.userId, idempotencyKey: req.get("Idempotency-Key") || req.body?.idempotencyKey });
        if (!result.duplicate) await audit(req, { action: "CREATE", resource: "purchase", resourceId: result.purchase._id, details: { invoiceNumber: result.purchase.invoiceNumber, total: result.purchase.total, itemCount: result.purchase.itemCount } });
        return res.status(result.duplicate ? 200 : 201).json({ success: true, ...result });
    } catch (error) { return res.status(error.statusCode || 500).json({ success: false, error: error.message }); }
}

export async function getPurchaseController(req, res) {
    try {
        const purchase = await getPurchaseById({ tenantId: req.tenantId, purchaseId: req.params.id });
        if (!purchase) return res.status(404).json({ success: false, error: "Purchase not found." });
        return res.status(200).json({ success: true, purchase });
    } catch (error) { return res.status(error.statusCode || 500).json({ success: false, error: error.message }); }
}
