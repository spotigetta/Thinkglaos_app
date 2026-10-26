import { test } from "node:test";
import assert from "node:assert/strict";
import { mixPolicy } from "../lib/show-mixer";
const state = {
  phase: "llamada",
  running: true,
  internalMusic: true,
  volume: 0.7,
  duckLevel: 0.12,
};
test("Sentarse toma la música externa y conserva la mezcla local al terminar una voz", () => {
  assert.deepEqual(mixPolicy(state, true), {
    local: 0.7 * 0.12,
    external: 0,
    ms: 450,
  });
  assert.deepEqual(mixPolicy(state, false), {
    local: 0.7,
    external: 0,
    ms: 1400,
  });
});
test("Intro y salida nunca recuperan la música por un ended tardío", () => {
  for (const phase of ["intro", "salida", "charla", "preguntas"])
    for (const voice of [true, false]) {
      const p = mixPolicy({ ...state, phase }, voice);
      assert.equal(p.local, 0);
      assert.equal(p.external, 0);
    }
});
test("Montaje recupera exactamente el nivel externo y pausa silencia música local", () => {
  assert.equal(
    mixPolicy({ ...state, phase: "montaje", internalMusic: false }, true)
      .external,
    0.12,
  );
  assert.equal(
    mixPolicy({ ...state, phase: "montaje", internalMusic: false }, false)
      .external,
    1,
  );
  assert.equal(mixPolicy({ ...state, running: false }, false).local, 0);
});
