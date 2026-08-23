// ==========================================
// Universal Pharmacy Platform
// Payment Controller
// ==========================================

import {
    createPayment,
    getPaymentById,
    listPayments
} from "../services/paymentService.js";


// ==========================================
// CREATE PAYMENT
// ==========================================

export async function createPaymentController(
    req,
    res,
    next
) {

    try {

        const payment =
            await createPayment(
                req.body
            );


        return res
            .status(201)
            .json({

                success: true,

                payment

            });

    } catch (error) {

        return next(
            error
        );

    }
}


// ==========================================
// GET PAYMENT BY ID
// ==========================================

export async function getPaymentController(
    req,
    res,
    next
) {

    try {

        const payment =
            await getPaymentById(
                req.params.id
            );


        if (
            !payment
        ) {

            return res
                .status(404)
                .json({

                    success: false,

                    error:
                        "Payment not found."

                });

        }


        return res.json({

            success: true,

            payment

        });

    } catch (error) {

        return next(
            error
        );

    }
}


// ==========================================
// LIST PAYMENTS
// ==========================================

export async function listPaymentsController(
    req,
    res,
    next
) {

    try {

        const payments =
            await listPayments({

                transactionId:
                    req.query.transactionId,

                limit:
                    req.query.limit,

                skip:
                    req.query.skip

            });


        return res.json({

            success: true,

            count:
                payments.length,

            payments

        });

    } catch (error) {

        return next(
            error
        );

    }
}