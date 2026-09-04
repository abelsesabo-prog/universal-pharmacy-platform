import { getCollection } from "./index.js";
import { COLLECTIONS } from "../../shared/schemas/index.js";
import { buildJournal } from "./ledgerService.js";

function fail(message, statusCode = 400) { const e = new Error(message); e.statusCode = statusCode; throw e; }
function text(v) { return String(v ?? "").trim(); }
export async function postJournal(input = {}) { const journal = buildJournal(input); const result = await getCollection(COLLECTIONS.LEDGER_JOURNALS).insertOne(journal); return { ...journal, _id: result.insertedId }; }
export async function listJournals({ tenantId, account, limit = 100 } = {}) { const id = text(tenantId); if (!id) fail("Tenant context is required.", 403); const filter = { tenantId: id }; if (text(account)) filter["lines.account"] = text(account); return getCollection(COLLECTIONS.LEDGER_JOURNALS).find(filter).sort({ createdAt: -1 }).limit(Math.min(Math.max(Number(limit) || 100, 1), 200)).toArray(); }
