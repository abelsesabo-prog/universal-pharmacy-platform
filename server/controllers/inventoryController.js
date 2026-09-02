import { createBatch, listBatches, listStockMovements, recordStockAdjustment } from "../services/inventoryService.js";

function actor(req) { return req.user?.userId || req.user?.sub || null; }

export async function createBatchController(req, res, next) {
    try {
        const batch = await createBatch({ tenantId: req.user.tenantId, createdBy: actor(req), ...req.body });
        return res.status(201).json({ success: true, batch });
    } catch (error) { return next(error); }
}

export async function listBatchesController(req, res, next) {
    try {
        const batches = await listBatches({ tenantId: req.user.tenantId, productId: req.query.productId, branchId: req.query.branchId, limit: req.query.limit, skip: req.query.skip });
        return res.json({ success: true, count: batches.length, batches });
    } catch (error) { return next(error); }
}

export async function listStockMovementsController(req, res, next) {
    try {
        const movements = await listStockMovements({ tenantId: req.user.tenantId, productId: req.query.productId, limit: req.query.limit, skip: req.query.skip });
        return res.json({ success: true, count: movements.length, movements });
    } catch (error) { return next(error); }
}

export async function adjustStockController(req, res, next) {
    try {
        const movement = await recordStockAdjustment({ tenantId: req.user.tenantId, createdBy: actor(req), ...req.body });
        return res.status(201).json({ success: true, movement });
    } catch (error) { return next(error); }
}
