import express from "express";
import { healthCheck } from "../controllers/healthController.js";
import productRoutes from "./productRoutes.js";
import authRoutes from "./authRoutes.js";
import catalogRoutes from "./catalogRoutes.js";
import inventoryRoutes from "./inventoryRoutes.js";
import salesRoutes from "./salesRoutes.js";

const router = express.Router();
router.get("/health", healthCheck);
router.use("/auth", authRoutes);
router.use("/products", productRoutes);
router.use("/catalog", catalogRoutes);
router.use(inventoryRoutes);
router.use(salesRoutes);
export default router;
