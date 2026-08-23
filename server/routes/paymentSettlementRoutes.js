// ==========================================
// Universal Pharmacy Platform
// Payment Settlement Routes
// ==========================================

import express from "express";

import {
    getPaymentSettlementController
} from "../controllers/paymentSettlementController.js";


const router =
    express.Router();


// ==========================================
// GET PAYMENT SETTLEMENT
// ==========================================

router.get(
    "/:transactionId",
    getPaymentSettlementController
);


export default router;