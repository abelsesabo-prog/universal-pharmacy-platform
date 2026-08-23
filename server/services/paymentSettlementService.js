// ==========================================
// Universal Pharmacy Platform
// Payment Settlement Service
// ==========================================

import { ObjectId } from "mongodb";

import {
    COLLECTIONS
} from "../../shared/schemas/index.js";

import {
    getCollection
} from "./index.js";


// ==========================================
// SETTLEMENT STATUS
// ==========================================

export const PAYMENT_SETTLEMENT_STATUS =
    Object.freeze([
        "UNPAID",
        "PARTIALLY_PAID",
        "PAID",
        "OVERPAID"
    ]);


// ==========================================
// GET PAYMENT SETTLEMENT
// ==========================================

export async function getPaymentSettlement(
    transactionId
) {

    if (
        !ObjectId.isValid(
            transactionId
        )
    ) {

        const error =
            new Error(
                "Invalid transaction ID."
            );

        error.statusCode = 400;

        throw error;
    }


    const transactions =
        getCollection(
            COLLECTIONS.TRANSACTIONS
        );


    const payments =
        getCollection(
            COLLECTIONS.PAYMENTS
        );


    const transactionObjectId =
        new ObjectId(
            transactionId
        );


    const transaction =
        await transactions.findOne({

            _id:
                transactionObjectId

        });


    if (
        !transaction
    ) {

        const error =
            new Error(
                "Transaction not found."
            );

        error.statusCode = 404;

        throw error;
    }


    const transactionTotal =
        Number(
            transaction.totalAmount
        );


    const paymentRecords =
        await payments
            .find({

                transactionId:
                    transactionObjectId

            })
            .sort({

                createdAt:
                    1

            })
            .toArray();


    const totalPaid =
        paymentRecords.reduce(

            (
                total,
                payment
            ) =>

                total +
                Number(
                    payment.baseAmount || 0
                ),

            0

        );


    const balance =
        transactionTotal -
        totalPaid;


    let status;


    if (
        totalPaid <= 0
    ) {

        status =
            "UNPAID";

    } else if (
        totalPaid <
        transactionTotal
    ) {

        status =
            "PARTIALLY_PAID";

    } else if (
        totalPaid ===
        transactionTotal
    ) {

        status =
            "PAID";

    } else {

        status =
            "OVERPAID";

    }


    const amountDue =
        Math.max(
            balance,
            0
        );


    const overpayment =
        Math.max(
            totalPaid -
            transactionTotal,
            0
        );


    return {

        transactionId:
            transaction._id,

        transactionTotal,

        totalPaid,

        balance,

        amountDue,

        overpayment,

        status,

        paymentCount:
            paymentRecords.length,

        payments:
            paymentRecords

    };
}