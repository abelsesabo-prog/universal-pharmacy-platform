import test from "node:test";
import assert from "node:assert/strict";
import { validateFinancialEntry } from "./financialService.js";
import { validateComplaint } from "./complaintService.js";

 test("financial entry enforces tenant, direction, amount and payment method", () => {
    assert.throws(() => validateFinancialEntry({ amount: 100, direction: "IN", paymentMethod: "CASH" }), /Tenant context/);
    assert.throws(() => validateFinancialEntry({ tenantId: "t1", amount: 0, direction: "IN", paymentMethod: "CASH" }), /greater than zero/);
    assert.throws(() => validateFinancialEntry({ tenantId: "t1", amount: 100, direction: "SIDEWAYS", paymentMethod: "CASH" }), /IN or OUT/);
    assert.throws(() => validateFinancialEntry({ tenantId: "t1", amount: 100, direction: "IN", paymentMethod: "CHEQUE" }), /Unsupported payment method/);
    assert.equal(validateFinancialEntry({ tenantId: "t1", account: "Sales", amount: 100, direction: "IN", paymentMethod: "cash" }).paymentMethod, "CASH");
});

test("complaint validation creates an open tenant-scoped complaint", () => {
    const complaint = validateComplaint({ tenantId: "t1", subject: "Long wait", description: "Customer waited too long", priority: "high" });
    assert.equal(complaint.tenantId, "t1");
    assert.equal(complaint.status, "OPEN");
    assert.equal(complaint.priority, "HIGH");
    assert.throws(() => validateComplaint({ tenantId: "t1", subject: "", description: "x" }), /subject is required/);
    assert.throws(() => validateComplaint({ tenantId: "t1", subject: "x", description: "", priority: "NORMAL" }), /description is required/);
});
