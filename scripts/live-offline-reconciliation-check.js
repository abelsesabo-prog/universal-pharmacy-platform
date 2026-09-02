import assert from "node:assert/strict";

const baseUrl = String(process.env.OFFLINE_ACCEPTANCE_BASE_URL || "").replace(/\/$/, "");
const tokenA = String(process.env.OFFLINE_ACCEPTANCE_TOKEN_A || "").trim();
const tokenB = String(process.env.OFFLINE_ACCEPTANCE_TOKEN_B || "").trim();
const usernameA = String(process.env.OFFLINE_ACCEPTANCE_USERNAME_A || "").trim();
const passwordA = String(process.env.OFFLINE_ACCEPTANCE_PASSWORD_A || "");
const usernameB = String(process.env.OFFLINE_ACCEPTANCE_USERNAME_B || "").trim();
const passwordB = String(process.env.OFFLINE_ACCEPTANCE_PASSWORD_B || "");
const configuredTenantId = String(process.env.OFFLINE_ACCEPTANCE_TENANT_ID || "").trim();

if (!baseUrl) {
    console.error("Missing OFFLINE_ACCEPTANCE_BASE_URL.");
    process.exitCode = 2;
} else if ((!tokenA || !tokenB) && (!usernameA || !passwordA || !usernameB || !passwordB)) {
    console.error("Provide either both acceptance tokens or both acceptance username/password pairs.");
    console.error("Token mode: OFFLINE_ACCEPTANCE_TOKEN_A, OFFLINE_ACCEPTANCE_TOKEN_B");
    console.error("Login mode: OFFLINE_ACCEPTANCE_USERNAME_A, OFFLINE_ACCEPTANCE_PASSWORD_A, OFFLINE_ACCEPTANCE_USERNAME_B, OFFLINE_ACCEPTANCE_PASSWORD_B");
    process.exitCode = 2;
} else {
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const deviceA = `acceptance-device-a-${suffix}`;
    const deviceB = `acceptance-device-b-${suffix}`;
    const eventId = `acceptance-sale-${suffix}`;

    function decodeClaims(token) {
        try {
            const payload = token.split(".")[1];
            return JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
        } catch {
            return null;
        }
    }

    async function login(username, password) {
        const response = await fetch(`${baseUrl}/api/auth/login`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ username, password })
        });
        const body = await response.json().catch(() => ({}));
        assert.equal(response.ok, true, JSON.stringify(body));
        assert.ok(body.token, "Login response did not contain a token.");
        return body.token;
    }

    async function resolveToken(existingToken, username, password) {
        return existingToken || login(username, password);
    }

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

    const event = (id, tenantId, deviceId, amount) => ({
        eventId: id,
        tenantId,
        deviceId,
        eventType: "SALE",
        occurredAt: new Date().toISOString(),
        sequence: 1,
        payload: { acceptance: true, amount }
    });

    try {
        const resolvedTokenA = await resolveToken(tokenA, usernameA, passwordA);
        const resolvedTokenB = await resolveToken(tokenB, usernameB, passwordB);
        const claimsA = decodeClaims(resolvedTokenA);
        const claimsB = decodeClaims(resolvedTokenB);
        assert.ok(claimsA?.tenantId, "Device A token has no tenant claim.");
        assert.ok(claimsB?.tenantId, "Device B token has no tenant claim.");
        assert.equal(claimsA.tenantId, claimsB.tenantId, "Acceptance identities must belong to the same tenant.");
        if (configuredTenantId) assert.equal(claimsA.tenantId, configuredTenantId, "Acceptance tenant does not match the authenticated tenant.");

        const tenantId = claimsA.tenantId;
        const first = await sync(resolvedTokenA, deviceA, [event(eventId, tenantId, deviceA, 100)]);
        assert.equal(first.received, 1);
        assert.equal(first.applied, 1);

        const duplicate = await sync(resolvedTokenA, deviceA, [event(eventId, tenantId, deviceA, 100)]);
        assert.equal(duplicate.received, 1);
        assert.equal(duplicate.duplicates, 1);
        assert.equal(duplicate.conflicts, 0);

        const conflict = await sync(resolvedTokenA, deviceA, [event(eventId, tenantId, deviceA, 999)]);
        assert.equal(conflict.received, 1);
        assert.equal(conflict.conflicts, 1);

        const second = await sync(resolvedTokenB, deviceB, [event(`acceptance-sale-b-${suffix}`, tenantId, deviceB, 200)]);
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
