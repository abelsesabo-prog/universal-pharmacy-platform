import assert from "node:assert/strict";

const baseUrl = String(process.env.OFFLINE_ACCEPTANCE_BASE_URL || "http://localhost:10000").replace(/\/$/, "");
const tokenA = String(process.env.OFFLINE_ACCEPTANCE_TOKEN_A || "").trim();
const tokenB = String(process.env.OFFLINE_ACCEPTANCE_TOKEN_B || "").trim();
const usernameA = String(process.env.OFFLINE_ACCEPTANCE_USERNAME_A || "").trim();
const passwordA = String(process.env.OFFLINE_ACCEPTANCE_PASSWORD_A || "");
const usernameB = String(process.env.OFFLINE_ACCEPTANCE_USERNAME_B || "").trim();
const passwordB = String(process.env.OFFLINE_ACCEPTANCE_PASSWORD_B || "");
const configuredTenantId = String(process.env.OFFLINE_ACCEPTANCE_TENANT_ID || "").trim();

const placeholders = [
    "YOUR-SERVER",
    "YOUR_TENANT_ID",
    "USER_A",
    "USER_B",
    "PASSWORD_A",
    "PASSWORD_B"
];

function isPlaceholder(value) {
    return placeholders.some((placeholder) => value.toUpperCase().includes(placeholder));
}

const invalidConfiguration = [
    ["OFFLINE_ACCEPTANCE_BASE_URL", baseUrl],
    ["OFFLINE_ACCEPTANCE_USERNAME_A", usernameA],
    ["OFFLINE_ACCEPTANCE_PASSWORD_A", passwordA],
    ["OFFLINE_ACCEPTANCE_TENANT_ID", configuredTenantId]
].filter(([, value]) => value && isPlaceholder(value));

if (invalidConfiguration.length) {
    console.error("Acceptance configuration still contains placeholder values:");
    for (const [name] of invalidConfiguration) console.error(`- ${name}`);
    console.error("Use the real server URL and real authentication credentials. Secrets must not be pasted into chat.");
    process.exitCode = 2;
} else if ((!tokenA && (!usernameA || !passwordA)) || (!tokenB && (usernameB || passwordB) && (!usernameB || !passwordB))) {
    console.error("Provide Device A credentials/token. Device B may reuse Device A by leaving B variables unset.");
    console.error("Token mode: OFFLINE_ACCEPTANCE_TOKEN_A (and optional TOKEN_B)");
    console.error("Login mode: OFFLINE_ACCEPTANCE_USERNAME_A + OFFLINE_ACCEPTANCE_PASSWORD_A (and optional B pair)");
    process.exitCode = 2;
} else {
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const deviceA = `acceptance-device-a-${suffix}`;
    const deviceB = `acceptance-device-b-${suffix}`;
    const eventId = `acceptance-sale-${suffix}`;

    function decodeClaims(token) {
        try {
            const parts = token.split(".");
            if (parts.length !== 3) return null;
            return JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
        } catch {
            return null;
        }
    }

    async function login(username, password, label) {
        const response = await fetch(`${baseUrl}/api/auth/login`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ username, password })
        });
        const body = await response.json().catch(() => ({}));
        assert.equal(response.ok, true, `${label} login failed: ${JSON.stringify(body)}`);
        assert.ok(body.token, `${label} login response did not contain a token.`);
        return body.token;
    }

    async function resolveToken(existingToken, username, password, label) {
        return existingToken || login(username, password, label);
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
        const resolvedTokenA = await resolveToken(tokenA, usernameA, passwordA, "Device A");
        const resolvedTokenB = await resolveToken(
            tokenB,
            usernameB || usernameA,
            passwordB || passwordA,
            "Device B"
        );
        const claimsA = decodeClaims(resolvedTokenA);
        const claimsB = decodeClaims(resolvedTokenB);

        assert.ok(claimsA, "Device A authentication token is not a JWT produced by this platform.");
        assert.ok(claimsB, "Device B authentication token is not a JWT produced by this platform.");
        assert.ok(
            claimsA.tenantId,
            `Device A token has no tenant claim. Check OFFLINE_ACCEPTANCE_BASE_URL (${baseUrl}) points to the current authentication service.`
        );
        assert.ok(
            claimsB.tenantId,
            `Device B token has no tenant claim. Check OFFLINE_ACCEPTANCE_BASE_URL (${baseUrl}) points to the current authentication service.`
        );
        assert.equal(claimsA.tenantId, claimsB.tenantId, "Acceptance identities must belong to the same tenant.");
        if (configuredTenantId) {
            assert.equal(claimsA.tenantId, configuredTenantId, "Acceptance tenant does not match the authenticated tenant.");
        }

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
            checks: [
                "device A applied",
                "device A duplicate acknowledged",
                "event fingerprint conflict detected",
                "device B independently reconciled"
            ]
        }, null, 2));
    } catch (error) {
        console.error("Live offline reconciliation acceptance failed:", error.message);
        process.exitCode = 1;
    }
}
