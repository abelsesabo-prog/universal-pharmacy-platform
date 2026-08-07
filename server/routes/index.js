import express from "express";

const router = express.Router();

router.get("/health", (req, res) => {
    res.json({
        success: true,
        message: "Universal Pharmacy Platform API is running."
    });
});

export default router;