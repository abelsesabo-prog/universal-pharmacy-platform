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
            .filter(Boolean),
        authUsername: process.env.AUTH_USERNAME || "",
        authPasswordHash: process.env.AUTH_PASSWORD_HASH || "",
        authTenantId: process.env.AUTH_TENANT_ID || "",
        authRole: process.env.AUTH_ROLE || "admin"
    }
};

if (config.app.environment === "production") {
    const required = [
        ["JWT_SECRET", config.security.jwtSecret],
        ["AUTH_USERNAME", config.security.authUsername],
        ["AUTH_PASSWORD_HASH", config.security.authPasswordHash],
        ["AUTH_TENANT_ID", config.security.authTenantId]
    ];

    const missing = required
        .filter(([, value]) => !value)
        .map(([name]) => name);

    if (missing.length) {
        throw new Error(`Missing required production security settings: ${missing.join(", ")}`);
    }
}

export default config;
