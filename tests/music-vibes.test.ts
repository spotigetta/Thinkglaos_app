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
import { vibeStyles, type MusicBands } from "../lib/music-vibes";
test("La dirección musical usa el espectro, reserva flashes para picos rítmicos y no depende del azar", () => {
  const settings = readVibes({
    styles: vibeStyles.map((s) => s.id),
    rotation: "musical",
  });
  const run = (bands: MusicBands, random: number) => {
    const d = new VibesDirector(() => random);
    for (let t = 0; t <= 18000; t += 25) {
      d.sample(bands, t, t % 500 === 0);
      d.choose(settings, "track", t);
    }
    return d;
  };
  const airy = run({ bass: 0.08, mid: 0.25, high: 0.7, air: 0.65 }, 0);
  const bass = run({ bass: 0.8, mid: 0.3, high: 0.15, air: 0.08 }, 0);
  assert.ok(["halo", "aurora", "prism"].includes(airy.status().style!));
  assert.ok(["shapes", "tunnel", "contrast"].includes(bass.status().style!));
  assert.notEqual(airy.status().style, bass.status().style);
  assert.equal(
    bass.status().style,
    run({ bass: 0.8, mid: 0.3, high: 0.15, air: 0.08 }, 0.99).status().style,
  );
  assert.equal(bass.status().bpm, 120);
  const gentle = readVibes({
      styles: ["contrast", "halo"],
      rotation: "musical",
    }),
    d = new VibesDirector();
  for (let t = 0; t < 20000; t += 25) {
    d.sample({ bass: 0.1, mid: 0.2, high: 0.2, air: 0.1 }, t);
    assert.notEqual(d.choose(gentle, "quiet", t), "contrast");
  }
});
test("La dirección reconoce un crescendo sostenido, deja respirar tras una caída y conserva la selección", () => {
  const settings = readVibes({
      styles: ["halo", "wave", "prism", "rays", "tunnel"],
      rotation: "musical",
    }),
    d = new VibesDirector();
  const sections = new Set<string>();
  for (let t = 0; t <= 56000; t += 25) {
    const r = Math.max(0, Math.min(1, (t - 18000) / 14000));
    const b =
      t < 38000
        ? {
            bass: 0.15 + r * 0.4,
            mid: 0.2 + r * 0.5,
            high: 0.12 + r * 0.6,
            air: 0.1 + r * 0.4,
          }
        : { bass: 0.03, mid: 0.06, high: 0.07, air: 0.03 };
    d.sample(b, t);
    const style = d.choose(settings, "track", t);
    assert.ok(settings.styles.includes(style));
    sections.add(d.status().section);
  }
  assert.ok(sections.has("build"), "a real ramp should be recognised");
  assert.equal(d.status().section, "break");
  assert.equal(d.status().style, "halo");
});
test("Los cambios no siguen cada golpe y la estimación de tempo desaparece al perder el ritmo", () => {
  const d = new VibesDirector(),
    settings = readVibes({
      styles: vibeStyles.map((s) => s.id),
      rotation: "musical",
    });
  let last = "",
    changes = 0;
  for (let t = 0; t <= 30000; t += 25) {
    const beat = t % 500 === 0;
    d.sample(
      { bass: beat ? 0.9 : 0.5, mid: 0.5, high: 0.3, air: 0.15 },
      t,
      beat,
    );
    const style = d.choose(settings, "track", t);
    if (style !== last) {
      changes++;
      last = style;
    }
  }
  assert.ok(changes < 7);
  assert.equal(d.status().bpm, 120);
  for (let t = 30025; t < 35000; t += 25)
    d.sample({ bass: 0.1, mid: 0.1, high: 0.1, air: 0.1 }, t);
  assert.equal(d.status().bpm, null);
  assert.equal(d.status().confidence, 0);
});
test("Con tempo estable las variaciones se alinean con bloques de cuatro pulsos", () => {
  const d = new VibesDirector(),
    settings = readVibes({
      styles: vibeStyles.map((s) => s.id),
      rotation: "musical",
    });
  let previous = "";
  const changes: number[] = [];
  for (let t = 0; t < 70000; t += 25) {
    d.sample(
      { bass: t % 500 < 100 ? 0.8 : 0.45, mid: 0.5, high: 0.3, air: 0.15 },
      t,
      t % 500 === 0,
    );
    const style = d.choose(settings, "rhythmic", t);
    if (style !== previous) {
      if (t > 5000) changes.push(t);
      previous = style;
    }
  }
  assert.ok(changes.length >= 2);
  assert.ok(
    changes.every((t) => t % 2000 < 150),
    "changes should land on estimated four-beat boundaries",
  );
});
test("Un golpe aislado no provoca una nueva sección ni una rotación completa", () => {
  const d = new VibesDirector(),
    settings = readVibes({
      styles: vibeStyles.map((s) => s.id),
      rotation: "musical",
    });
  let before = "";
  for (let t = 0; t < 15000; t += 25) {
    d.sample({ bass: 0.1, mid: 0.2, high: 0.3, air: 0.2 }, t);
    before = d.choose(settings, "calm", t);
  }
  for (let t = 15000; t < 15200; t += 25) {
    d.sample({ bass: 1, mid: 1, high: 1, air: 1 }, t, true);
    d.choose(settings, "calm", t);
  }
  for (let t = 15200; t < 17000; t += 25) {
    d.sample({ bass: 0.1, mid: 0.2, high: 0.3, air: 0.2 }, t);
    d.choose(settings, "calm", t);
  }
  assert.equal(d.status().style, before);
  assert.ok(["calm", "break"].includes(d.status().section));
});
test("Al regresar un tramo espectral parecido se recupera su motivo visual", () => {
  const settings = readVibes({
      styles: vibeStyles.map((s) => s.id),
      rotation: "musical",
    }),
    d = new VibesDirector();
  let recalled = false;
  for (let t = 0; t < 70000; t += 25) {
    const chorus = (t >= 15000 && t < 35000) || t >= 50000;
    const bands = chorus
      ? { bass: t % 500 < 100 ? 0.95 : 0.65, mid: 0.65, high: 0.5, air: 0.3 }
      : { bass: 0.05, mid: 0.1, high: 0.15, air: 0.08 };
    d.sample(bands, t, chorus && t % 500 === 0);
    d.choose(settings, "one-song", t);
    if (t > 50000 && d.status().reason.includes("Vuelve el motivo"))
      recalled = true;
  }
  assert.equal(recalled, true);
});
test("Mantener efecto no cambia al entrar señal y las memorias se reinician en otra canción", () => {
  const d = new VibesDirector(() => 0.1),
    settings = readVibes({ styles: ["halo", "tunnel"], rotation: "fixed" });
  const first = d.choose(settings, "a", 0);
  for (let t = 0; t < 30000; t += 25) {
    d.sample({ bass: 0.9, mid: 0.7, high: 0.6, air: 0.4 }, t, t % 500 === 0);
    assert.equal(d.choose(settings, "a", t), first);
  }
  d.choose({ ...settings, rotation: "musical" }, "b", 30000);
  assert.equal(d.status().bpm, null);
  assert.equal(d.status().confidence, 0);
  assert.ok(!d.status().reason.includes("Vuelve el motivo"));
});
