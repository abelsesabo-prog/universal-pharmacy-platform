import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs/promises";

const routePath = new URL("../server/routes/tmdaQuarantineRoutes.js", import.meta.url);
const indexPath = new URL("../server/routes/index.js", import.meta.url);
const controllerPath = new URL("../server/controllers/tmdaQuarantineController.js", import.meta.url);

test("TMDA quarantine API requires authentication and management role", async () => {
    const source = await fs.readFile(routePath, "utf8");
    assert.match(source, /router\.use\(requireAuth\)/);
    assert.match(source, /router\.post\("\/quarantine", requireRole\("admin", "manager"\), createQuarantineController\)/);
    assert.match(source, /router\.post\("\/quarantine\/:id\/disposition", requireRole\("admin", "manager"\), applyQuarantineDispositionController\)/);
});

test("TMDA quarantine API is mounted under /api/tmda", async () => {
    const source = await fs.readFile(indexPath, "utf8");
    assert.match(source, /import tmdaQuarantineRoutes from "\.\/tmdaQuarantineRoutes\.js"/);
    assert.match(source, /router\.use\("\/tmda", tmdaQuarantineRoutes\)/);
});

test("TMDA controllers derive tenant and actor from authenticated identity", async () => {
    const source = await fs.readFile(controllerPath, "utf8");
    assert.match(source, /tenantId: req\.user\.tenantId/);
    assert.match(source, /createdBy: actorId\(req\)/);
    assert.match(source, /quarantineId: req\.params\.id/);
    assert.match(source, /recordAudit/);
    assert.match(source, /TMDA_QUARANTINE_CREATED/);
    assert.match(source, /TMDA_QUARANTINE_DISPOSITION_APPLIED/);
});
