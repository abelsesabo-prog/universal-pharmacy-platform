// ==========================================
// Universal Pharmacy Platform
// Environment Configuration
// ==========================================

require("dotenv").config();

const config = {
    port: process.env.PORT || 10000,

    nodeEnv: process.env.NODE_ENV || "development",

    mongodbUri:
        process.env.MONGODB_URI ||
        "",

    corsOrigin:
        process.env.CORS_ORIGIN ||
        "*"
};

module.exports = config;