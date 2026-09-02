import "dotenv/config";

const config = {
    app: {
        name: "Universal Pharmacy Platform",
        environment: process.env.NODE_ENV || "development",
        port: Number(process.env.PORT) || 10000
    },

    database: {
        mongodbUri: process.env.MONGODB_URI || ""
    },

    security: {
        jwtSecret: process.env.JWT_SECRET || "",
        corsOrigins: (process.env.CORS_ORIGIN || "")
            .split(",")
            .map((origin) => origin.trim())
            .filter(Boolean)
    }
};

if (config.app.environment === "production" && !config.security.jwtSecret) {
    throw new Error("JWT_SECRET is required in production.");
}

export default config;
