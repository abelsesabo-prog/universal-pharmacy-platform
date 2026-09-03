import express from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { requireTenant } from "../middleware/tenant.js";
import { receivePurchaseController, getPurchaseController } from "../controllers/purchaseController.js";

const router = express.Router();
const context = [requireAuth, requireTenant];

router.post("/purchases", ...context, requireRole("admin", "manager"), receivePurchaseController);
router.get("/purchases/:id", ...context, requireRole("admin", "manager"), getPurchaseController);

export default router;
