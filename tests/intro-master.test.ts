import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createHash } from "node:crypto";
test("La intro equilibra la voz con la música y conserva el original verificable", () => {
  const report = JSON.parse(
    fs.readFileSync("public/media/intro-master-v1.json", "utf8"),
  );
  const hash = (url: string) =>
    createHash("sha256")
      .update(fs.readFileSync("public/" + url.slice(2)))
      .digest("hex");
  assert.equal(hash(report.source), report.sourceSHA256);
  assert.equal(hash(report.url), report.masterSHA256);
  assert.ok(report.after.spoken.LUFS - report.before.spoken.LUFS > 12);
  assert.ok(Math.abs(report.after.spoken.LUFS - report.after.music.LUFS) < 2);
  assert.ok(report.after.whole.truePeakDB < -0.5);
  assert.ok(report.after.quiet.LUFS < -48);
  assert.ok(report.videoSHA256.startsWith("SHA256="));
});
