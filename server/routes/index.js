import express from "express";
import { healthCheck } from "../controllers/healthController.js";
import productRoutes from "./productRoutes.js";
import authRoutes from "./authRoutes.js";
import catalogRoutes from "./catalogRoutes.js";

const router = express.Router();

router.get("/health", healthCheck);
router.use("/auth", authRoutes);
router.use("/products", productRoutes);
router.use("/catalog", catalogRoutes);

export default router;
