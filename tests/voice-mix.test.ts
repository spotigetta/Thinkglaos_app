import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { normalizedVoiceUrl, clampVoiceBoost } from "../lib/voice-mix";

test("Los 142 masters de voz tienen nivel medido consistente y picos con margen", () => {
  const report = JSON.parse(
    fs.readFileSync("public/media/voice-master-v1.json", "utf8"),
  );
  assert.equal(report.files.length, 142);
  for (const row of report.files) {
    assert.equal(normalizedVoiceUrl(row.source), row.url);
    assert.ok(row.afterLUFS >= -17 && row.afterLUFS <= -15, row.source);
    assert.ok(row.truePeakDB < -0.7, row.source);
    assert.ok(fs.statSync("public/" + row.url.slice(2)).size > 1000);
  }
  const quiet = report.files.find((r: any) =>
    r.source.endsWith("oct25-g1-s1-01.mp3"),
  );
  assert.ok(quiet.afterLUFS - quiet.beforeLUFS > 9);
  assert.equal(clampVoiceBoost(99), 3);
  assert.equal(clampVoiceBoost(NaN), 1.5);
});
