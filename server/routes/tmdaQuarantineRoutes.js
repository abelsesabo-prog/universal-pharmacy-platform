import express from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import {
    createQuarantineController,
    applyQuarantineDispositionController
} from "../controllers/tmdaQuarantineController.js";

const router = express.Router();
router.post("/quarantine", requireAuth, requireRole("admin", "manager"), createQuarantineController);
router.post("/quarantine/:id/disposition", requireAuth, requireRole("admin", "manager"), applyQuarantineDispositionController);

export default router;
