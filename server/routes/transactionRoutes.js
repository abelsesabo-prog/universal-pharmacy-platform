// ==========================================
// Universal Pharmacy Platform
// Transaction Routes
// ==========================================

import express from "express";

import {
    createTransactionController,
    getTransactionController,
    listTransactionsController
} from "../controllers/transactionController.js";


const router =
    express.Router();


// ==========================================
// CREATE TRANSACTION
// ==========================================

router.post(
    "/",
    createTransactionController
);


// ==========================================
// LIST TRANSACTIONS
// ==========================================

router.get(
    "/",
    listTransactionsController
);


// ==========================================
// GET TRANSACTION BY ID
// ==========================================

router.get(
    "/:id",
    getTransactionController
);


export default router;