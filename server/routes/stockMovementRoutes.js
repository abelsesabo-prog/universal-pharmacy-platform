// ==========================================
// Universal Pharmacy Platform
// Stock Movement Routes
// ==========================================

import express from "express";

import {
    createStockMovementController,
    getStockMovementController,
    listStockMovementsController
} from "../controllers/stockMovementController.js";


const router = express.Router();


// Create stock movement
router.post(
    "/",
    createStockMovementController
);


// List stock movements
router.get(
    "/",
    listStockMovementsController
);


// Get one stock movement
router.get(
    "/:id",
    getStockMovementController
);


export default router;