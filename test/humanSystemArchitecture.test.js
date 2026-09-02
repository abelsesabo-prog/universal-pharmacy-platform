import test from "node:test";
import assert from "node:assert/strict";
import { HUMAN_SYSTEM_ANATOMY, HUMAN_SYSTEM_LAYERS, validateHumanSystemAnatomy } from "../server/architecture/humanSystem.js";

test("human-system architecture contains body, system, organ, tissue and cell layers", () => {
    const result = validateHumanSystemAnatomy();
    assert.equal(result.valid, true, result.errors.join("; "));
    for (const layer of Object.values(HUMAN_SYSTEM_LAYERS)) {
        assert.ok(HUMAN_SYSTEM_ANATOMY.some(node => node.layer === layer), `missing ${layer}`);
    }
});

test("product identity is a cell under the inventory tissue rather than a second product registry", () => {
    const productCell = HUMAN_SYSTEM_ANATOMY.find(node => node.id === "product-cell");
    const inventoryTissue = HUMAN_SYSTEM_ANATOMY.find(node => node.id === "inventory-tissue");
    assert.equal(productCell?.layer, HUMAN_SYSTEM_LAYERS.CELL);
    assert.equal(inventoryTissue?.layer, HUMAN_SYSTEM_LAYERS.TISSUE);
    assert.match(productCell?.purpose || "", /generic grouping.*brand variant/i);
});

test("architecture validator rejects duplicate anatomy nodes", () => {
    const result = validateHumanSystemAnatomy([
        ...HUMAN_SYSTEM_ANATOMY,
        HUMAN_SYSTEM_ANATOMY[0]
    ]);
    assert.equal(result.valid, false);
    assert.ok(result.errors.some(error => /duplicate anatomy node/i.test(error)));
});
