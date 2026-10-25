import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { sceneCues, nextCue, voiceGap, type ShowCue } from "../lib/show-voices";
const extra: ShowCue[] = JSON.parse(
  fs.readFileSync("public/media/locuciones-oct25.json", "utf8"),
).cues;
const original: ShowCue[] = JSON.parse(
  fs.readFileSync("public/media/locuciones.json", "utf8"),
).cues;
const all = [...original, ...extra];
test("Las 104 nuevas voces tienen recortes y el discurso se reserva al agradecimiento", () => {
  assert.equal(extra.length, 104);
  assert.equal(sceneCues(all, "agradecimiento").length, 1);
  for (const c of extra) {
    assert.ok(c.end > c.start);
    assert.ok(fs.statSync("public/" + c.url.slice(2)).size > 1000);
  }
  assert.equal(sceneCues(all, "charla").length, 0);
  assert.equal(sceneCues(all, "preguntas").length, 0);
  const tranquility = extra.find((c) => c.url.endsWith("oct25-g2-s2-09.mp3"))!;
  assert.ok(tranquility.start < 189.5);
  assert.equal(
    extra.find((c) => c.url.endsWith("oct25-g2-s2-08.mp3"))!.end,
    tranquility.start,
  );
  assert.ok(
    !sceneCues(all, "montaje").some((c) =>
      c.url.endsWith("oct25-g1-s1-29.mp3"),
    ),
  );
  assert.ok(
    sceneCues(all, "montaje").every(
      (c) => !c.text.includes("El ponente ya ha cumplido"),
    ),
  );
  assert.ok(
    sceneCues(all, "pizzas").some((c) =>
      c.text.includes("El ponente ya ha cumplido"),
    ),
  );
  assert.ok(
    !sceneCues(all, "ambiente").some((c) =>
      c.text.includes("El ponente ya ha cumplido"),
    ),
  );
});
test("La rotación alterna voces sin perder frases y vuelve a empezar al completar el banco", () => {
  const pool = sceneCues(all, "montaje");
  assert.notEqual(pool[0].voice, pool[1].voice);
  const played = [];
  let last = "";
  for (let i = 0; i < pool.length; i++) {
    const c = nextCue(all, "montaje", last)!;
    played.push(c.url);
    last = c.url;
  }
  assert.equal(new Set(played).size, pool.length);
  assert.equal(nextCue(all, "montaje", last)?.url, pool[0].url);
  assert.equal(nextCue(all, "charla", ""), undefined);
  assert.equal(voiceGap(0), 10);
  assert.equal(voiceGap(500), 240);
  assert.equal(voiceGap(NaN), 60);
});
