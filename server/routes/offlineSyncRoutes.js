import express from "express";
import { requireAuth } from "../middleware/auth.js";
import { syncOfflineEventsController } from "../controllers/offlineSyncController.js";

const router = express.Router();
router.post("/sync", requireAuth, syncOfflineEventsController);

export default router;
