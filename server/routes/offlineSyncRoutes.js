import express from "express";
import { requireAuth } from "../middleware/auth.js";
import { syncOfflineEventsController } from "../controllers/offlineSyncController.js";

const router = express.Router();
router.use(requireAuth);
router.post("/sync", syncOfflineEventsController);
export default router;
