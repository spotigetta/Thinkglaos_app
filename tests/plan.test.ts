import { test } from "node:test";
import assert from "node:assert/strict";
import { Phase } from "../types";
import { normalizePhase, planUpdates, extraPlan } from "../lib/plan";
test("Cuatro fases: los accesos antiguos se integran en la tarde", () => {
  assert.equal(Object.values(Phase).length, 4);
  assert.equal(normalizePhase("Protocolo de Entradas"), Phase.AFTERNOON_BEFORE);
  assert.equal(normalizePhase("Post-Thinkglao"), Phase.POST_EVENT);
});
test("Kit y horarios de montaje incluyen material y QR", () => {
  assert.match(planUpdates["manual-007"].notes.join(" "), /2 espuertas/);
  assert.match(planUpdates["manual-013"].time, /19:30/);
  assert.match(planUpdates["manual-005"].time, /17:30/);
  assert.ok(extraPlan.some((t) => t.phase === Phase.POST_EVENT));
});
