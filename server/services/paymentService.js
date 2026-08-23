// ==========================================
// Universal Pharmacy Platform
// Payment Service
// ==========================================

import { ObjectId } from "mongodb";

import {
    COLLECTIONS
} from "../../shared/schemas/index.js";

import {
    getCollection
} from "./index.js";

import {
    enforcePaymentValidation
} from "./paymentValidationService.js";

// ==========================================
// PAYMENT METHODS
// ==========================================

export const PAYMENT_METHODS =
    Object.freeze([
        "CASH",
        "MOBILE_MONEY",
        "CARD",
        "BANK_TRANSFER",
        "CHEQUE",
        "INSURANCE",
        "CREDIT",
        "OTHER"
    ]);


// ==========================================
// PAYMENT PROVIDERS
// ==========================================

export const PAYMENT_PROVIDERS =
    Object.freeze([
        "M_PESA",
        "AIRTEL_MONEY",
        "MIX_BY_YAS",
        "HALOPESA",
        "T_PESA",

        "VISA",
        "MASTERCARD",
        "AMERICAN_EXPRESS",
        "DISCOVER",
        "DINERS_CLUB",
        "JCB",
        "UNIONPAY",
        "MAESTRO",
        "RUPAY",
        "VERVE",
        "MIR",
        "TROY",
        "INTERAC",

        "BANK",
        "CASHIER",
        "OTHER"
    ]);


// ==========================================
// BUSINESS BASE CURRENCY
// ==========================================

export const BASE_CURRENCY =
    "TZS";


// ==========================================
// CURRENCY NORMALIZATION
// ==========================================

function normalizeCurrency(
    currency
) {

    const value =
        String(
            currency || BASE_CURRENCY
        )
            .trim()
            .toUpperCase();


    if (
        value.length !== 3
    ) {

        const error =
            new Error(
                "Currency must use a 3-letter ISO currency code."
            );

        error.statusCode = 400;

        throw error;
    }


    return value;
}


// ==========================================
// PAYMENT NORMALIZATION
// ==========================================

function normalizePayment(
    data
) {

    return {

        transactionId:
            data.transactionId
                ? new ObjectId(
                    data.transactionId
                )
                : null,

        method:
            String(
                data.method || ""
            )
                .trim()
                .toUpperCase(),

        provider:
            data.provider
                ? String(
                    data.provider
                )
                    .trim()
                    .toUpperCase()
                : null,

        amount:
            Number(
                data.amount
            ),

        currency:
            normalizeCurrency(
                data.currency
            ),

        exchangeRate:
            Number(
                data.exchangeRate ?? 1
            ),

        baseAmount:
            Number(
                data.baseAmount
            ),

        reference:
            data.reference
                ? String(
                    data.reference
                ).trim()
                : null,

        notes:
            data.notes
                ? String(
                    data.notes
                ).trim()
                : null,

        createdAt:
            new Date()

    };
}


// ==========================================
// CREATE PAYMENT
// ==========================================

export async function createPayment(
    data
) {

    if (
        !data.transactionId ||
        !ObjectId.isValid(
            data.transactionId
        )
    ) {

        const error =
            new Error(
                "Valid transaction ID is required."
            );

        error.statusCode = 400;

        throw error;
    }


    const method =
        String(
            data.method || ""
        )
            .trim()
            .toUpperCase();


    if (
        !PAYMENT_METHODS.includes(
            method
        )
    ) {

        const error =
            new Error(
                `Invalid payment method. Allowed methods: ${PAYMENT_METHODS.join(", ")}`
            );

        error.statusCode = 400;

        throw error;
    }


    const provider =
        data.provider
            ? String(
                data.provider
            )
                .trim()
                .toUpperCase()
            : null;


    if (
        provider &&
        !PAYMENT_PROVIDERS.includes(
            provider
        )
    ) {

        const error =
            new Error(
                "Invalid payment provider."
            );

        error.statusCode = 400;

        throw error;
    }


    const amount =
        Number(
            data.amount
        );


    if (
        !Number.isFinite(
            amount
        ) ||
        amount <= 0
    ) {

        const error =
            new Error(
                "Payment amount must be greater than zero."
            );

        error.statusCode = 400;

        throw error;
    }


    const currency =
        normalizeCurrency(
            data.currency
        );


    const exchangeRate =
        Number(
            data.exchangeRate ?? 1
        );


    if (
        !Number.isFinite(
            exchangeRate
        ) ||
        exchangeRate <= 0
    ) {

        const error =
            new Error(
                "Exchange rate must be greater than zero."
            );

        error.statusCode = 400;

        throw error;
    }


    const baseAmount =
        amount *
        exchangeRate;

await enforcePaymentValidation({

    transactionId:
        data.transactionId,

    baseAmount

});

    const payments =
        getCollection(
            COLLECTIONS.PAYMENTS
        );


    const payment =
        normalizePayment({

            ...data,

            method,

            provider,

            amount,

            currency,

            exchangeRate,

            baseAmount

        });


    const result =
        await payments.insertOne(
            payment
        );


    return {

        ...payment,

        _id:
            result.insertedId

    };
}


// ==========================================
// GET PAYMENT BY ID
// ==========================================

export async function getPaymentById(
    paymentId
) {

    if (
        !ObjectId.isValid(
            paymentId
        )
    ) {

        const error =
            new Error(
                "Invalid payment ID."
            );

        error.statusCode = 400;

        throw error;
    }


    const payments =
        getCollection(
            COLLECTIONS.PAYMENTS
        );


    return payments.findOne({

        _id:
            new ObjectId(
                paymentId
            )

    });
}


// ==========================================
// LIST PAYMENTS
// ==========================================

export async function listPayments(
    options = {}
) {

    const payments =
        getCollection(
            COLLECTIONS.PAYMENTS
        );


    const filter = {};


    if (
        options.transactionId
    ) {

        if (
            !ObjectId.isValid(
                options.transactionId
            )
        ) {

            const error =
                new Error(
                    "Invalid transaction ID."
                );

            error.statusCode = 400;

            throw error;
        }


        filter.transactionId =
            new ObjectId(
                options.transactionId
            );
    }


    const limit =
        Math.min(
            Math.max(
                Number(
                    options.limit
                ) || 50,
                1
            ),
            100
        );


    const skip =
        Math.max(
            Number(
                options.skip
            ) || 0,
            0
        );


    return payments
        .find(filter)
        .sort({

            createdAt:
                -1

        })
        .skip(skip)
        .limit(limit)
        .toArray();
}