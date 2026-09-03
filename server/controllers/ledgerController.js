import { postJournal, listJournals, trialBalance } from "../services/ledgerService.js";
import { recordAudit } from "../services/auditService.js";

function idempotencyKey(req) {
    return req.get("Idempotency-Key") || req.body?.idempotencyKey;
}

export async function postJournalController(req, res, next) {
    try {
        const result = await postJournal({
            tenantId: req.user.tenantId,
            branchId: req.body.branchId,
            currency: req.body.currency,
            referenceType: req.body.referenceType,
            referenceId: req.body.referenceId,
            idempotencyKey: idempotencyKey(req),
            description: req.body.description,
            lines: req.body.lines
        });
        try {
            await recordAudit({
                tenantId: req.user.tenantId,
                actorId: req.user.sub,
                action: result.duplicate ? "LEDGER_JOURNAL_DUPLICATE" : "LEDGER_JOURNAL_POSTED",
                resource: "ledger_journal",
                resourceId: result.journal?._id,
                details: { idempotencyKey: result.journal?.idempotencyKey, duplicate: result.duplicate },
                requestId: req.id
            });
        } catch (error) { console.error("Audit log write failed:", error.message); }
        return res.status(result.duplicate ? 200 : 201).json({ success: true, duplicate: result.duplicate, journal: result.journal });
    } catch (error) { return next(error); }
}

export async function listJournalsController(req, res, next) {
    try {
        const journals = await listJournals({ tenantId: req.user.tenantId, branchId: req.query.branchId, from: req.query.from, to: req.query.to, limit: req.query.limit, skip: req.query.skip });
        return res.json({ success: true, count: journals.length, journals });
    } catch (error) { return next(error); }
}

export async function trialBalanceController(req, res, next) {
    try {
        const accounts = await trialBalance({ tenantId: req.user.tenantId, branchId: req.query.branchId, currency: req.query.currency });
        return res.json({ success: true, count: accounts.length, accounts });
    } catch (error) { return next(error); }
}
