import express from "express";

import { healthCheck } from "../controllers/healthController.js";

import productRoutes from "./productRoutes.js";

import batchRoutes from "./batchRoutes.js";

import stockMovementRoutes from "./stockMovementRoutes.js";

import transactionRoutes from "./transactionRoutes.js";

import paymentRoutes from "./paymentRoutes.js";

import paymentSettlementRoutes from "./paymentSettlementRoutes.js";

const router = express.Router();


router.get(
    "/health",
    healthCheck
);


router.use(
    "/products",
    productRoutes
);


router.use(
    "/batches",
    batchRoutes
);


router.use(
    "/stock-movements",
    stockMovementRoutes
);


router.use(
    "/transactions",
    transactionRoutes
);
export default router;


router.use(
    "/payments/settlement",
    paymentSettlementRoutes
);

router.use(
    "/payments",
    paymentRoutes
);