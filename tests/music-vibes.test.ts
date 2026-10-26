import { test } from "node:test";
import assert from "node:assert/strict";
import {
  BeatDetector,
  defaultVibes,
  readVibes,
  vibesInScene,
  analyserEnergy,
} from "../lib/music-vibes";
test("Los pulsos requieren señal por encima del umbral y respetan la separación mínima", () => {
  const d = new BeatDetector();
  assert.equal(d.sample(0.1, 0.4, 0), false);
  assert.equal(d.sample(0.8, 0.4, 100), true);
  assert.equal(d.sample(0.95, 0.4, 300), false);
  d.sample(0, 0.4, 700);
  assert.equal(d.sample(0.8, 0.4, 800), true);
  const high = new BeatDetector();
  assert.equal(high.sample(0.5, 0.9, 0), false);
});
test("Las vibes comienzan apagadas, se centran en sentarse y respetan la intro limpia", () => {
  assert.equal(defaultVibes.enabled, false);
  const enabled = { ...defaultVibes, enabled: true };
  assert.equal(vibesInScene(enabled, "llamada"), true);
  assert.equal(vibesInScene(enabled, "montaje"), false);
  assert.equal(vibesInScene({ ...enabled, scope: "all" }, "pizzas"), true);
  assert.equal(vibesInScene({ ...enabled, scope: "all" }, "intro"), false);
  assert.equal(readVibes({ threshold: 3, intensity: -2 }).threshold, 1);
  assert.equal(readVibes({ threshold: NaN }).threshold, 0.38);
});
test("El detector distingue silencio de señal musical real", () => {
  const samples = new Float32Array(1024),
    bins = new Uint8Array(512);
  let amplitude = 0;
  const analyser = {
    fftSize: 1024,
    getFloatTimeDomainData: (a: Float32Array) => a.fill(amplitude),
    getByteFrequencyData: (a: Uint8Array) => a.fill(190),
  } as unknown as AnalyserNode;
  assert.equal(analyserEnergy(analyser, samples, bins, 48000), 0);
  amplitude = 0.18;
  assert.ok(analyserEnergy(analyser, samples, bins, 48000) > 0.4);
});
