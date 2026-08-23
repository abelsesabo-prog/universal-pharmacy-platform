// ==========================================
// Universal Pharmacy Platform
// Payment Routes
// ==========================================

import express from "express";

import {
    createPaymentController,
    getPaymentController,
    listPaymentsController
} from "../controllers/paymentController.js";


const router =
    express.Router();


// ==========================================
// CREATE PAYMENT
// ==========================================

router.post(
    "/",
    createPaymentController
);


// ==========================================
// LIST PAYMENTS
// ==========================================

router.get(
    "/",
    listPaymentsController
);


// ==========================================
// GET PAYMENT BY ID
// ==========================================

router.get(
    "/:id",
    getPaymentController
);


export default router;