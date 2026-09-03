import { getCollection } from "./index.js";
import { COLLECTIONS } from "../../shared/schemas/index.js";

function fail(message, statusCode = 409) { const error = new Error(message); error.statusCode = statusCode; throw error; }

export async function assertPersistedPeriodOpen({ tenantId, at = new Date() } = {}) {
    const id = String(tenantId || "").trim();
    if (!id) fail("Tenant context is required.", 403);
    const date = at instanceof Date ? at : new Date(at);
    if (Number.isNaN(date.getTime())) fail("Invalid accounting timestamp.", 400);
    const closed = await getCollection(COLLECTIONS.ACCOUNTING_PERIODS).findOne({ tenantId: id, closed: true, startsAt: { $lte: date }, endsAt: { $gt: date } });
    if (closed) fail("Accounting period is closed.", 409);
    return true;
}
