// ==========================================
// Universal Pharmacy Platform
// Stock Movement Controller
// ==========================================

import {
    createStockMovement,
    getStockMovementById,
    listStockMovements
} from "../services/stockMovementService.js";


export async function createStockMovementController(
    req,
    res
) {

    try {

        const movement =
            await createStockMovement(
                req.body
            );


        res.status(201).json({
            success: true,
            movement
        });

    } catch (error) {

        const statusCode =
            error.statusCode || 500;


        res.status(statusCode).json({
            success: false,
            error: error.message
        });
    }
}


export async function getStockMovementController(
    req,
    res
) {

    try {

        const movement =
            await getStockMovementById(
                req.params.id
            );


        if (!movement) {

            return res.status(404).json({
                success: false,
                error:
                    "Stock movement not found."
            });
        }


        res.status(200).json({
            success: true,
            movement
        });

    } catch (error) {

        const statusCode =
            error.statusCode || 500;


        res.status(statusCode).json({
            success: false,
            error: error.message
        });
    }
}


export async function listStockMovementsController(
    req,
    res
) {

    try {

        const movements =
            await listStockMovements({
                limit:
                    req.query.limit,

                skip:
                    req.query.skip,

                productId:
                    req.query.productId,

                batchId:
                    req.query.batchId,

                type:
                    req.query.type
            });


        res.status(200).json({
            success: true,
            count:
                movements.length,
            movements
        });

    } catch (error) {

        const statusCode =
            error.statusCode || 500;


        res.status(statusCode).json({
            success: false,
            error: error.message
        });
    }
}