import { createSaleReturn, getSaleReturnById } from "../services/returnService.js";

export async function createSaleReturnController(req, res) {
    try {
        const result = await createSaleReturn({ ...req.body, tenantId: req.tenantId, branchId: req.body.branchId || req.user.branchId, createdBy: req.user?.sub || req.user?.userId || null });
        return res.status(result.duplicate ? 200 : 201).json({ success: true, ...result });
    } catch (error) {
        return res.status(error.statusCode || 500).json({ success: false, error: error.message });
    }
}

export async function getSaleReturnController(req, res) {
    try {
        const result = await getSaleReturnById({ tenantId: req.tenantId, returnId: req.params.id });
        if (!result) return res.status(404).json({ success: false, error: "Sale return not found." });
        return res.json({ success: true, return: result });
    } catch (error) {
        return res.status(error.statusCode || 500).json({ success: false, error: error.message });
    }
}
