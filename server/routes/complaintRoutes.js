import express from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { createComplaintController, listComplaintsController, updateComplaintController } from "../controllers/complaintController.js";

const router = express.Router();
router.get("/complaints", requireAuth, listComplaintsController);
router.post("/complaints", requireAuth, requireRole("admin", "manager", "staff"), createComplaintController);
router.patch("/complaints/:id", requireAuth, requireRole("admin", "manager"), updateComplaintController);

export default router;
