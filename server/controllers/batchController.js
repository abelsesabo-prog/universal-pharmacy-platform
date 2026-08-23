// ==========================================
// Universal Pharmacy Platform
// Batch Controller
// ==========================================

import {
    createBatch,
    getBatchById,
    updateBatch,
    deleteBatch,
    listBatches
} from "../services/batchService.js";

export async function createBatchController(req, res) {
    try {
        const batch = await createBatch(req.body);

        res.status(201).json({
            success: true,
            batch
        });

    } catch (error) {
        const statusCode = error.statusCode || 500;

        res.status(statusCode).json({
            success: false,
            error: error.message
        });
    }
}

export async function getBatchController(req, res) {
    try {
        const batch = await getBatchById(req.params.id);

        if (!batch) {
            return res.status(404).json({
                success: false,
                error: "Batch not found."
            });
        }

        res.status(200).json({
            success: true,
            batch
        });

    } catch (error) {
        const statusCode = error.statusCode || 500;

        res.status(statusCode).json({
            success: false,
            error: error.message
        });
    }
}

export async function updateBatchController(req, res) {
    try {
        const batch = await updateBatch(
            req.params.id,
            req.body
        );

        res.status(200).json({
            success: true,
            batch
        });

    } catch (error) {
        const statusCode = error.statusCode || 500;

        res.status(statusCode).json({
            success: false,
            error: error.message
        });
    }
}

export async function deleteBatchController(req, res) {
    try {
        const result = await deleteBatch(req.params.id);

        res.status(200).json({
            success: true,
            ...result
        });

    } catch (error) {
        const statusCode = error.statusCode || 500;

        res.status(statusCode).json({
            success: false,
            error: error.message
        });
    }
}

export async function listBatchesController(req, res) {
    try {
        const batches = await listBatches({
            productId: req.query.productId,
            limit: req.query.limit,
            skip: req.query.skip
        });

        res.status(200).json({
            success: true,
            count: batches.length,
            batches
        });

    } catch (error) {
        const statusCode = error.statusCode || 500;

        res.status(statusCode).json({
            success: false,
            error: error.message
        });
    }
}