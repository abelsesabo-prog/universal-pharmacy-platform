import { listJournals, postJournal, trialBalance } from "../services/ledgerService.js";
import { recordAudit } from "../services/auditService.js";

export async function postJournalController(req, res, next) {
    try {
        const { journal, duplicate } = await postJournal({
            tenantId: req.user.tenantId,
            branchId: req.body.branchId,
            currency: req.body.currency,
            referenceType: req.body.referenceType,
            referenceId: req.body.referenceId,
            idempotencyKey: req.body.idempotencyKey,
            description: req.body.description,
            lines: req.body.lines
        });
        try {
            await recordAudit({
                tenantId: req.user.tenantId,
                actorId: req.user.sub,
                action: duplicate ? "LEDGER_JOURNAL_DUPLICATE" : "LEDGER_JOURNAL_POSTED",
                resource: "ledger_journal",
                resourceId: journal._id,
                details: { referenceType: journal.referenceType, referenceId: journal.referenceId, idempotencyKey: journal.idempotencyKey, duplicate },
                requestId: req.id
            });
        } catch (error) { console.error("Audit log write failed:", error.message); }
        return res.status(duplicate ? 200 : 201).json({ success: true, duplicate, journal });
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
        const accounts = await trialBalance({ tenantId: req.user.tenantId, branchId: req.query.branchId, currency: req.query.currency || "TZS" });
        return res.json({ success: true, currency: String(req.query.currency || "TZS").toUpperCase(), accounts });
    } catch (error) { return next(error); }
}
