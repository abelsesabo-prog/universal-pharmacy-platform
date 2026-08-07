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
    }
};

module.exports = config;