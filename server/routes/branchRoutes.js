import express from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { createBranchController, listBranchesController } from "../controllers/branchController.js";

const router = express.Router();
router.get("/branches", requireAuth, listBranchesController);
router.post("/branches", requireAuth, requireRole("admin", "manager"), createBranchController);

export default router;
