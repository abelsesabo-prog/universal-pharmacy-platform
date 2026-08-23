// ==========================================
// Universal Pharmacy Platform
// Batch Routes
// ==========================================

import express from "express";

import {
    createBatchController,
    getBatchController,
    updateBatchController,
    deleteBatchController,
    listBatchesController
} from "../controllers/batchController.js";


const router = express.Router();


router.post(
    "/",
    createBatchController
);


router.get(
    "/",
    listBatchesController
);


router.get(
    "/:id",
    getBatchController
);


router.patch(
    "/:id",
    updateBatchController
);


router.delete(
    "/:id",
    deleteBatchController
);


export default router;