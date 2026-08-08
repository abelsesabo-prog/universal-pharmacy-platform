import express from "express";
import { healthCheck } from "../controllers/healthController.js";
import productRoutes from "./productRoutes.js";

const router = express.Router();

router.get("/health", healthCheck);

router.use("/products", productRoutes);

export default router;