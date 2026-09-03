import express from "express";
import { requireAuth } from "../middleware/auth.js";
import { requireTenant } from "../middleware/tenant.js";
import { createDelegationController, revokeDelegationController, authorizeDelegatedActionController } from "../controllers/delegationController.js";

const router = express.Router();
router.use(requireAuth, requireTenant);
router.post("/", createDelegationController);
router.post("/authorize", authorizeDelegatedActionController);
router.post("/:id/revoke", revokeDelegationController);
export default router;
