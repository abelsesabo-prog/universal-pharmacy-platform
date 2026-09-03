import express from "express";
import { authMiddleware } from "../middleware/auth.js";
import { tenantMiddleware } from "../middleware/tenant.js";
import { createDelegationController, revokeDelegationController, authorizeDelegatedActionController } from "../controllers/delegationController.js";

const router = express.Router();
router.use(authMiddleware, tenantMiddleware);
router.post("/", createDelegationController);
router.post("/authorize", authorizeDelegatedActionController);
router.post("/:id/revoke", revokeDelegationController);
export default router;
