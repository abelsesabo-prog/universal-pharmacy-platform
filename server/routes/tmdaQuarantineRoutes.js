import express from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import {
    createQuarantineController,
    applyQuarantineDispositionController
} from "../controllers/tmdaQuarantineController.js";

const router = express.Router();
router.use(requireAuth);
router.post("/quarantine", requireRole("admin", "manager"), createQuarantineController);
router.post("/quarantine/:id/disposition", requireRole("admin", "manager"), applyQuarantineDispositionController);

export default router;
