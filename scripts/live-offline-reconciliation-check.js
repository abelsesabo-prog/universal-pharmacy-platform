import assert from "node:assert/strict";

const baseUrl = String(process.env.OFFLINE_ACCEPTANCE_BASE_URL || "").replace(/\/$/, "");
const tokenA = String(process.env.OFFLINE_ACCEPTANCE_TOKEN_A || "").trim();
const tokenB = String(process.env.OFFLINE_ACCEPTANCE_TOKEN_B || "").trim();
const tenantId = String(process.env.OFFLINE_ACCEPTANCE_TENANT_ID || "").trim();

if (!baseUrl || !tokenA || !tokenB || !tenantId) {
    console.error("Missing live acceptance configuration.");
    console.error("Required: OFFLINE_ACCEPTANCE_BASE_URL, OFFLINE_ACCEPTANCE_TOKEN_A, OFFLINE_ACCEPTANCE_TOKEN_B, OFFLINE_ACCEPTANCE_TENANT_ID");
    process.exitCode = 2;
} else {
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const deviceA = `acceptance-device-a-${suffix}`;
    const deviceB = `acceptance-device-b-${suffix}`;
    const eventId = `acceptance-sale-${suffix}`;

    async function sync(token, deviceId, events) {
        const response = await fetch(`${baseUrl}/api/offline/sync`, {
            method: "POST",
            headers: {
                "content-type": "application/json",
                authorization: `Bearer ${token}`
            },
            body: JSON.stringify({ deviceId, events })
        });
        const body = await response.json().catch(() => ({}));
        assert.equal(response.ok, true, JSON.stringify(body));
        assert.equal(body.success, true);
        return body;
    }

    const event = (id, deviceId, amount) => ({
        eventId: id,
        tenantId,
        deviceId,
        eventType: "SALE",
        occurredAt: new Date().toISOString(),
        sequence: 1,
        payload: { acceptance: true, amount }
    });

    try {
        const first = await sync(tokenA, deviceA, [event(eventId, deviceA, 100)]);
        assert.equal(first.received, 1);
        assert.equal(first.applied, 1);

        const duplicate = await sync(tokenA, deviceA, [event(eventId, deviceA, 100)]);
        assert.equal(duplicate.received, 1);
        assert.equal(duplicate.duplicates, 1);
        assert.equal(duplicate.conflicts, 0);

        const conflict = await sync(tokenA, deviceA, [event(eventId, deviceA, 999)]);
        assert.equal(conflict.received, 1);
        assert.equal(conflict.conflicts, 1);

        const second = await sync(tokenB, deviceB, [event(`acceptance-sale-b-${suffix}`, deviceB, 200)]);
        assert.equal(second.received, 1);
        assert.equal(second.applied, 1);

        console.log(JSON.stringify({
            success: true,
            tenantId,
            devices: [deviceA, deviceB],
            checks: ["device A applied", "device A duplicate acknowledged", "event fingerprint conflict detected", "device B independently reconciled"]
        }, null, 2));
    } catch (error) {
        console.error("Live offline reconciliation acceptance failed:", error.message);
        process.exitCode = 1;
    }
}
