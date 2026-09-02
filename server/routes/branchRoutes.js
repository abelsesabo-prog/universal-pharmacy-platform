import express from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { createBranchController, listBranchesController } from "../controllers/branchController.js";

const router = express.Router();
router.use(requireAuth);
router.get("/branches", listBranchesController);
router.post("/branches", requireRole("admin", "manager"), createBranchController);
export default router;
