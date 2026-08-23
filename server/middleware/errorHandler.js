// ==========================================
// Universal Pharmacy Platform
// Global Error Handler
// ==========================================

export function errorHandler(
    error,
    req,
    res,
    next
) {

    const statusCode =
        Number(
            error.statusCode
        ) ||
        500;


    const message =
        error.message ||
        "Internal server error.";


    console.error(
        "API ERROR:",
        {
            statusCode,
            message,
            path: req.originalUrl,
            method: req.method
        }
    );


    return res
        .status(
            statusCode
        )
        .json({

            success: false,

            error:
                message

        });
}