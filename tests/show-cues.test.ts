import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
test("Los 37 recortes conservan las voces y caben sin solaparse en 27 + 3 minutos", () => {
  const { cues, match } = JSON.parse(
    fs.readFileSync("public/media/locuciones.json", "utf8"),
  );
  assert.equal(cues.length, 37);
  assert.ok(match > 0.95);
  for (const c of cues) {
    assert.ok(c.end > c.start);
    assert.ok(fs.existsSync("public/" + c.url.slice(2)));
  }
  assert.equal(cues.filter((c: any) => c.voice === 3).length, 7);
  assert.ok(
    cues
      .filter((c: any) => c.voice !== 3)
      .reduce((s: number, c: any) => s + c.end - c.start, 0) < 1620,
  );
  assert.ok(
    cues
      .filter((c: any) => c.voice === 3)
      .reduce((s: number, c: any) => s + c.end - c.start, 0) < 180,
  );
});
