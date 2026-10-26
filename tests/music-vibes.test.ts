import { test } from "node:test";
import assert from "node:assert/strict";
import {
  BeatDetector,
  defaultVibes,
  readVibes,
  vibesInScene,
  analyserEnergy,
  flashDuration,
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

test("El detector sigue golpes cada 480 ms y no repite flashes sobre un tono sostenido", () => {
  const beats = new BeatDetector();
  for (let i = 0; i < 8; i++) {
    beats.sample(0.1, 0.4, i * 480 - 50);
    assert.equal(beats.sample(0.8, 0.4, i * 480), true);
  }
  const sustained = new BeatDetector();
  assert.equal(sustained.sample(0.8, 0.4, 0), true);
  for (let time = 25; time < 5000; time += 25)
    assert.equal(sustained.sample(0.8, 0.4, time), false);
  assert.equal(defaultVibes.style, "contrast");
  assert.equal(flashDuration(0.5), 120);
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
test("Solo los graves disparan: los medios y agudos fuertes no contribuyen", () => {
  const bins = new Float32Array(1024);
  let activeBin = -1;
  const analyser = {
    fftSize: 2048,
    getFloatFrequencyData: (a: Float32Array) => {
      a.fill(-Infinity);
      if (activeBin >= 0) a[activeBin] = -12;
    },
  } as unknown as AnalyserNode;
  assert.equal(analyserEnergy(analyser, bins, 48000), 0);
  activeBin = Math.round((2000 * 2048) / 48000); // un sonido agudo muy fuerte
  assert.equal(analyserEnergy(analyser, bins, 48000), 0);
  activeBin = Math.round((80 * 2048) / 48000); // golpe de bombo
  assert.ok(analyserEnergy(analyser, bins, 48000) > 0.6);
});
import {
  VibesDirector,
  selectedVibes,
  proportionalIntensity,
} from "../lib/music-vibes";
test("La selección múltiple migra mezclas antiguas y nunca queda vacía", () => {
  assert.equal(selectedVibes({ style: "mixed" }).length, 8);
  assert.deepEqual(selectedVibes({ styles: ["wave", "wave", "halo"] }), [
    "wave",
    "halo",
  ]);
  assert.deepEqual(selectedVibes({ styles: [] }), ["contrast"]);
});
test("La intensidad parte de una base y crece proporcionalmente al exceso sobre el umbral", () => {
  assert.equal(proportionalIntensity(0.3, 0.4, 0.4), 0.3);
  assert.ok(proportionalIntensity(0.3, 0.7, 0.4) > 0.3);
  assert.equal(proportionalIntensity(0.3, 1, 0.4), 1);
  assert.ok(
    proportionalIntensity(0.3, 0.7, 0.6) < proportionalIntensity(0.3, 0.7, 0.4),
  );
});
test("La dirección mantiene tramos, cambia por canción o minutos y no recorre una lista por golpe", () => {
  const settings = readVibes({
    styles: ["halo", "wave", "tunnel"],
    rotation: "song",
  });
  const d = new VibesDirector(() => 0.99);
  const first = d.choose(settings, "song-a", 0);
  for (let i = 1; i < 50; i++)
    assert.equal(d.choose(settings, "song-a", i * 500), first);
  const second = d.choose(settings, "song-b", 25000);
  assert.notEqual(first, second);
  const timed = { ...settings, rotation: "minutes" as const, minutes: 1 };
  const t = new VibesDirector(() => 0.5);
  const a = t.choose(timed, "song-a", 0);
  assert.equal(t.choose(timed, "song-a", 59999), a);
  assert.notEqual(t.choose(timed, "song-a", 60000), a);
  const musical = { ...settings, rotation: "musical" as const, threshold: 0.3 };
  const m = new VibesDirector(() => 0.5);
  const quiet = m.choose(musical, "song-a", 0);
  for (let i = 0; i < 1000; i++) {
    m.sample(0.1, i * 25);
    m.choose(musical, "song-a", i * 25);
  }
  for (let i = 1000; i < 1200; i++) {
    m.sample(0.9, i * 25);
    m.choose(musical, "song-a", i * 25);
  }
  assert.notEqual(m.choose(musical, "song-a", 30000), quiet);
});
import { analyserSpectrum } from "../lib/music-vibes";
test("Las cuatro bandas espectrales son independientes y no confunden agudos con graves", () => {
  const bins = new Float32Array(1024);
  let hz = 80;
  const analyser = {
    fftSize: 2048,
    getFloatFrequencyData: (b: Float32Array) => {
      b.fill(-Infinity);
      b[Math.round((hz * 2048) / 48000)] = -12;
    },
  } as unknown as AnalyserNode;
  for (const [frequency, band] of [
    [80, "bass"],
    [400, "mid"],
    [2000, "high"],
    [8000, "air"],
  ] as const) {
    hz = frequency;
    const spectrum = analyserSpectrum(analyser, bins, 48000);
    assert.ok(spectrum[band] > 0.2);
    for (const other of ["bass", "mid", "high", "air"] as const)
      if (other !== band) assert.equal(spectrum[other], 0);
  }
});
