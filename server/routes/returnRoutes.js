import express from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { requireTenant } from "../middleware/tenant.js";
import { createSaleReturnController, getSaleReturnController } from "../controllers/returnController.js";

const router = express.Router();
const context = [requireAuth, requireTenant];

router.post("/sales/:saleId/returns", ...context, requireRole("admin", "manager"), (req, res, next) => {
    req.body = { ...(req.body || {}), saleId: req.params.saleId };
    return createSaleReturnController(req, res, next);
});
router.get("/sales/returns/:id", ...context, requireRole("admin", "manager"), getSaleReturnController);

export default router;
