// ==========================================
// Universal Pharmacy Platform
// Payment Validation Service
// ==========================================

import {
    getPaymentSettlement
} from "./paymentSettlementService.js";


// ==========================================
// VALIDATE INCOMING PAYMENT
// ==========================================

export async function validatePayment(
    paymentData
) {

    const settlement =
        await getPaymentSettlement(
            paymentData.transactionId
        );


    const incomingAmount =
        Number(
            paymentData.baseAmount
        );


    if (
        !Number.isFinite(
            incomingAmount
        ) ||
        incomingAmount <= 0
    ) {

        const error =
            new Error(
                "Incoming payment amount must be greater than zero."
            );

        error.statusCode = 400;

        throw error;
    }


    const projectedTotalPaid =
        settlement.totalPaid +
        incomingAmount;


    const projectedBalance =
        settlement.transactionTotal -
        projectedTotalPaid;


    const projectedOverpayment =
        Math.max(
            projectedTotalPaid -
            settlement.transactionTotal,
            0
        );


    return {

        transactionId:
            settlement.transactionId,

        transactionTotal:
            settlement.transactionTotal,

        currentTotalPaid:
            settlement.totalPaid,

        incomingPayment:
            incomingAmount,

        projectedTotalPaid,

        projectedBalance,

        projectedOverpayment,

        currentStatus:
            settlement.status,

        allowed:
            projectedOverpayment === 0

    };
}


// ==========================================
// ENFORCE PAYMENT VALIDATION
// ==========================================

export async function enforcePaymentValidation(
    paymentData
) {

    const validation =
        await validatePayment(
            paymentData
        );


    if (
        !validation.allowed
    ) {

        const error =
            new Error(
                `Payment would overpay the transaction by ${validation.projectedOverpayment}.`
            );

        error.statusCode = 400;

        throw error;
    }


    return validation;
}