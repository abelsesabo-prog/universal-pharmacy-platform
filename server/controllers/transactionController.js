// ==========================================
// Universal Pharmacy Platform
// Transaction Controller
// ==========================================

import {
    createTransaction,
    getTransactionById,
    listTransactions
} from "../services/transactionService.js";


// ==========================================
// CREATE TRANSACTION
// ==========================================

export async function createTransactionController(
    request,
    response
) {

    try {

        const transaction =
            await createTransaction(
                request.body
            );


        return response
            .status(201)
            .json({

                success:
                    true,

                transaction

            });

    } catch (error) {

        return response
            .status(
                error.statusCode || 500
            )
            .json({

                success:
                    false,

                error:
                    error.message ||
                    "Failed to create transaction."

            });
    }
}


// ==========================================
// GET TRANSACTION BY ID
// ==========================================

export async function getTransactionController(
    request,
    response
) {

    try {

        const transaction =
            await getTransactionById(
                request.params.id
            );


        if (!transaction) {

            return response
                .status(404)
                .json({

                    success:
                        false,

                    error:
                        "Transaction not found."

                });
        }


        return response
            .json({

                success:
                    true,

                transaction

            });

    } catch (error) {

        return response
            .status(
                error.statusCode || 500
            )
            .json({

                success:
                    false,

                error:
                    error.message ||
                    "Failed to get transaction."

            });
    }
}


// ==========================================
// LIST TRANSACTIONS
// ==========================================

export async function listTransactionsController(
    request,
    response
) {

    try {

        const transactions =
            await listTransactions(
                request.query
            );


        return response
            .json({

                success:
                    true,

                count:
                    transactions.length,

                transactions

            });

    } catch (error) {

        return response
            .status(
                error.statusCode || 500
            )
            .json({

                success:
                    false,

                error:
                    error.message ||
                    "Failed to list transactions."

            });
    }
}