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
    "PASSWORD_B",
    "REPLACE_WITH_"
];

function isPlaceholder(value) {
    return placeholders.some((placeholder) => value.toUpperCase().includes(placeholder));
}

function failConfiguration(message) {
    console.error(message);
    process.exitCode = 2;
}

const invalidConfiguration = [
    ["OFFLINE_ACCEPTANCE_BASE_URL", baseUrl],
    ["OFFLINE_ACCEPTANCE_USERNAME_A", usernameA],
    ["OFFLINE_ACCEPTANCE_PASSWORD_A", passwordA],
    ["OFFLINE_ACCEPTANCE_USERNAME_B", usernameB],
    ["OFFLINE_ACCEPTANCE_PASSWORD_B", passwordB],
    ["OFFLINE_ACCEPTANCE_TENANT_ID", configuredTenantId]
].filter(([, value]) => value && isPlaceholder(value));

if (invalidConfiguration.length) {
    failConfiguration(
        [
            "Acceptance configuration still contains placeholder values:",
            ...invalidConfiguration.map(([name]) => `- ${name}`),
            "Use the real server URL and real authentication credentials. Secrets must not be pasted into chat."
        ].join("\n")
    );
} else if ((!tokenA && (!usernameA || !passwordA)) || (!tokenB && (usernameB || passwordB) && (!usernameB || !passwordB))) {
    failConfiguration(
        [
            "Provide Device A credentials/token. Device B may reuse Device A by leaving B variables unset.",
            "Token mode: OFFLINE_ACCEPTANCE_TOKEN_A (and optional TOKEN_B)",
            "Login mode: OFFLINE_ACCEPTANCE_USERNAME_A + OFFLINE_ACCEPTANCE_PASSWORD_A (and optional B pair)"
        ].join("\n")
    );
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
        let response;
        try {
            response = await fetch(`${baseUrl}/api/auth/login`, {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ username, password })
            });
        } catch (error) {
            throw new Error(`${label} login could not reach ${baseUrl}: ${error.message}`);
        }

        const body = await response.json().catch(() => ({}));
        assert.equal(response.ok, true, `${label} login failed at ${baseUrl}: ${JSON.stringify(body)}`);
        assert.ok(body.token, `${label} login response did not contain a token.`);
        return body.token;
    }

    async function resolveToken(existingToken, username, password, label) {
        return existingToken || login(username, password, label);
    }

    async function createAcceptanceProduct(token, tenantId) {
        const product = {
            brandName: `Acceptance Test ${suffix}`,
            genericName: `Acceptance Offline ${suffix}`,
            dosageForm: "tablet",
            category: "acceptance-test",
            strength: 1,
            strengthUnit: "mg",
            manufacturer: "Universal Pharmacy Platform",
            baseUnit: "piece",
            uomMatrix: [{ unit: "piece", conversionFactor: 1, enabled: true, price: 100 }],
            stockQuantity: 10,
            barcode: `ACCEPT-${suffix}`
        };

        let response;
        try {
            response = await fetch(`${baseUrl}/api/products`, {
                method: "POST",
                headers: {
                    "content-type": "application/json",
                    authorization: `Bearer ${token}`
                },
                body: JSON.stringify(product)
            });
        } catch (error) {
            throw new Error(`Acceptance product creation could not reach ${baseUrl}: ${error.message}`);
        }

        const body = await response.json().catch(() => ({}));
        assert.equal(response.ok, true, `Acceptance product creation failed: ${JSON.stringify(body)}`);
        assert.ok(body.product?._id, "Acceptance product creation did not return a product ID.");
        assert.equal(body.product.tenantId, tenantId);
        return body.product;
    }

    async function sync(token, deviceId, tenantId, events) {
        let response;
        try {
            response = await fetch(`${baseUrl}/api/offline/sync`, {
                method: "POST",
                headers: {
                    "content-type": "application/json",
                    authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ tenantId, deviceId, events })
            });
        } catch (error) {
            throw new Error(`Offline sync could not reach ${baseUrl}: ${error.message}`);
        }
        const body = await response.json().catch(() => ({}));
        assert.equal(response.ok, true, JSON.stringify(body));
        assert.equal(body.success, true);
        return body;
    }

    const saleEvent = (id, tenantId, deviceId, productId, amount) => ({
        eventId: id,
        tenantId,
        deviceId,
        eventType: "SALE",
        occurredAt: new Date().toISOString(),
        sequence: 1,
        payload: {
            acceptance: true,
            productId: String(productId),
            quantity: 1,
            baseQuantity: 1,
            uom: "piece",
            conversionToBase: 1,
            unitPrice: amount,
            lineTotal: amount,
            payments: [{ method: "CASH", amount }]
        }
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

        assert.ok(claimsA, "Device A authentication token is not a JWT. Check that the acceptance URL points to this platform.");
        assert.ok(claimsB, "Device B authentication token is not a JWT. Check that the acceptance URL points to this platform.");
        assert.equal(claimsA.iss, "universal-pharmacy-platform", "Device A token issuer does not match this platform. Check OFFLINE_ACCEPTANCE_BASE_URL.");
        assert.equal(claimsB.iss, "universal-pharmacy-platform", "Device B token issuer does not match this platform. Check OFFLINE_ACCEPTANCE_BASE_URL.");
        assert.equal(claimsA.aud, "universal-pharmacy-api", "Device A token audience does not match this platform. Check OFFLINE_ACCEPTANCE_BASE_URL.");
        assert.equal(claimsB.aud, "universal-pharmacy-api", "Device B token audience does not match this platform. Check OFFLINE_ACCEPTANCE_BASE_URL.");
        assert.ok(claimsA.tenantId, `Device A token has no tenant claim. The login endpoint at ${baseUrl} is not issuing the required tenant-scoped token.`);
        assert.ok(claimsB.tenantId, `Device B token has no tenant claim. The login endpoint at ${baseUrl} is not issuing the required tenant-scoped token.`);
        assert.equal(claimsA.tenantId, claimsB.tenantId, "Acceptance identities must belong to the same tenant.");
        if (configuredTenantId) assert.equal(claimsA.tenantId, configuredTenantId, "Acceptance tenant does not match the authenticated tenant.");

        const tenantId = claimsA.tenantId;
        const product = await createAcceptanceProduct(resolvedTokenA, tenantId);

        const first = await sync(resolvedTokenA, deviceA, tenantId, [saleEvent(eventId, tenantId, deviceA, product._id, 100)]);
        assert.equal(first.received, 1);
        assert.equal(first.applied, 1);

        const duplicate = await sync(resolvedTokenA, deviceA, tenantId, [saleEvent(eventId, tenantId, deviceA, product._id, 100)]);
        assert.equal(duplicate.received, 1);
        assert.equal(duplicate.duplicates, 1);
        assert.equal(duplicate.conflicts, 0);

        const conflict = await sync(resolvedTokenA, deviceA, tenantId, [saleEvent(eventId, tenantId, deviceA, product._id, 999)]);
        assert.equal(conflict.received, 1);
        assert.equal(conflict.conflicts, 1);

        const second = await sync(resolvedTokenB, deviceB, tenantId, [saleEvent(`acceptance-sale-b-${suffix}`, tenantId, deviceB, product._id, 200)]);
        assert.equal(second.received, 1);
        assert.equal(second.applied, 1);

        console.log(JSON.stringify({
            success: true,
            tenantId,
            acceptanceProductId: String(product._id),
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
