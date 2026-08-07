import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();

const PORT = process.env.PORT || 10000;

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get("/api/health", (req, res) => {
    res.json({
        success: true,
        service: "Universal Pharmacy Platform",
        status: "online"
    });
});

// Root endpoint
app.get("/", (req, res) => {
    res.json({
        name: "Universal Pharmacy Platform",
        status: "online"
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`Universal Pharmacy Platform running on port ${PORT}`);
});