import express from "express";
import { loginController } from "../controllers/authController.js";
import { loginRateLimit } from "../middleware/security.js";

const router = express.Router();
router.post("/login", loginRateLimit, loginController);
export default router;
