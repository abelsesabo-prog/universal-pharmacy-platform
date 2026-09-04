import test from "node:test";
import assert from "node:assert/strict";
import { ObjectId } from "mongodb";
import {
    QUARANTINE_REASONS,
    QUARANTINE_STATUSES,
    DISPOSITION_TYPES,
    validateQuarantineRecord,
    validateDispositionTransition
} from "../server/services/tmdaQuarantineService.js";

test("TMDA quarantine contract has finite lifecycle and disposition vocabularies", () => {
    assert.deepEqual(QUARANTINE_STATUSES, ["QUARANTINED", "RELEASED", "DISPOSED"]);
    assert.ok(QUARANTINE_REASONS.includes("EXPIRED"));
    assert.ok(QUARANTINE_REASONS.includes("RECALL"));
    assert.ok(DISPOSITION_TYPES.includes("DESTROY"));
    assert.ok(DISPOSITION_TYPES.includes("AUTHORISED_RELEASE"));
});

test("TMDA quarantine requires tenant, product, batch, reason and positive quantity", () => {
    const result = validateQuarantineRecord({
        tenantId: "tenant-a",
        productId: new ObjectId().toHexString(),
        batchId: new ObjectId().toHexString(),
        reason: "EXPIRED",
        quantity: 10
    });
    assert.equal(result.valid, true);
});

test("TMDA quarantine rejects missing tenant and invalid stock references", () => {
    const result = validateQuarantineRecord({
        productId: "bad-product",
        batchId: "bad-batch",
        reason: "EXPIRED",
        quantity: 10
    });
    assert.equal(result.valid, false);
    assert.ok(result.errors.some(error => error.includes("tenantId")));
    assert.ok(result.errors.some(error => error.includes("productId")));
    assert.ok(result.errors.some(error => error.includes("batchId")));
});

test("TMDA quarantine rejects unsupported reason and non-positive quantity", () => {
    const result = validateQuarantineRecord({
        tenantId: "tenant-a",
        productId: new ObjectId().toHexString(),
        batchId: new ObjectId().toHexString(),
        reason: "INVENTED_REASON",
        quantity: 0
    });
    assert.equal(result.valid, false);
    assert.ok(result.errors.some(error => error.includes("reason")));
    assert.ok(result.errors.some(error => error.includes("quantity")));
});

test("only quarantined stock can be dispositioned and authorization is mandatory", () => {
    const valid = validateDispositionTransition({
        status: "QUARANTINED",
        disposition: "DESTROY",
        authorisedBy: "regulatory-officer"
    });
    assert.equal(valid.valid, true);

    const invalid = validateDispositionTransition({
        status: "RELEASED",
        disposition: "DESTROY",
        authorisedBy: "regulatory-officer"
    });
    assert.equal(invalid.valid, false);
    assert.ok(invalid.errors.some(error => error.includes("QUARANTINED")));
});

test("OTHER disposition requires an explanatory note", () => {
    const result = validateDispositionTransition({
        status: "QUARANTINED",
        disposition: "OTHER",
        authorisedBy: "officer"
    });
    assert.equal(result.valid, false);
    assert.ok(result.errors.some(error => error.includes("notes")));
});
