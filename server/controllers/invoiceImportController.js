import { previewInvoice, commitInvoice } from "../services/invoiceImportService.js";
import { recordAudit } from "../services/auditService.js";

function actor(req) { return req.user?.sub || req.user?.userId || null; }
async function audit(req, data) {
    try { await recordAudit({ tenantId: req.user.tenantId, actorId: actor(req), requestId: req.id, ...data }); }
    catch (error) { console.error("Invoice audit log write failed:", error.message); }
}

export async function previewInvoiceController(req, res, next) {
    try {
        if (!req.file) return res.status(400).json({ success: false, error: "Invoice file is required." });
        const preview = await previewInvoice(req.file.buffer, req.file.originalname);
        await audit(req, { action: "INVOICE_PREVIEW", resource: "invoice", details: { filename: preview.filename, rowCount: preview.rowCount, validRowCount: preview.validRowCount } });
        return res.json({ success: true, preview });
    } catch (error) { return next(error); }
}

export async function commitInvoiceController(req, res, next) {
    try {
        const { rows, filename, branchId } = req.body || {};
        const result = await commitInvoice({ tenantId: req.user.tenantId, createdBy: actor(req), branchId, rows, filename });
        await audit(req, { action: "INVOICE_IMPORT", resource: "invoice", details: { filename: result.filename, importedCount: result.importedCount, productsCreated: result.productsCreated, batchesCreated: result.batchesCreated } });
        return res.status(201).json({ success: true, result });
    } catch (error) { return next(error); }
}
