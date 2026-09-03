import express from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { createComplaintController, listComplaintsController, updateComplaintController } from "../controllers/complaintController.js";

const router = express.Router();
router.use(requireAuth);
router.get("/complaints", listComplaintsController);
router.post("/complaints", requireRole("admin", "manager", "staff"), createComplaintController);
router.patch("/complaints/:id", requireRole("admin", "manager"), updateComplaintController);
export default router;
