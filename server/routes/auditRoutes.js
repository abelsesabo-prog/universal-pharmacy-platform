import express from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { listAuditLogsController } from "../controllers/auditController.js";

const router = express.Router();
router.use(requireAuth, requireRole("admin", "manager"));
router.get("/audit-logs", listAuditLogsController);
export default router;
