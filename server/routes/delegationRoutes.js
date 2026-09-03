import express from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { requireTenant } from "../middleware/tenant.js";
import { createDelegationController, revokeDelegationController, authorizeDelegatedActionController } from "../controllers/delegationController.js";

const router = express.Router();
router.use(requireAuth, requireTenant);
router.post("/", requireRole("manager", "system_admin"), createDelegationController);
router.post("/authorize", authorizeDelegatedActionController);
router.post("/:id/revoke", requireRole("manager", "system_admin"), revokeDelegationController);
export default router;
