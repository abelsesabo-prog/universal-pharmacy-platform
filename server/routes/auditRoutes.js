import express from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { listAuditLogsController } from "../controllers/auditController.js";

const router = express.Router();
router.get("/audit-logs", requireAuth, requireRole("admin", "manager"), listAuditLogsController);

export default router;
