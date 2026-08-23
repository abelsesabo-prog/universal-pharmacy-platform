// ==========================================
// Universal Pharmacy Platform
// Payment Settlement Controller
// ==========================================

import {
    getPaymentSettlement
} from "../services/paymentSettlementService.js";


// ==========================================
// GET PAYMENT SETTLEMENT
// ==========================================

export async function getPaymentSettlementController(
    req,
    res,
    next
) {

    try {

        const settlement =
            await getPaymentSettlement(
                req.params.transactionId
            );


        return res.json({

            success: true,

            settlement

        });

    } catch (error) {

        return next(
            error
        );

    }
}