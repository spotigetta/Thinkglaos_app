import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createHash } from "node:crypto";
import { introMixLevel } from "../lib/voice-mix";
test("La intro conserva el archivo original y aplica un único refuerzo general", () => {
  assert.equal(
    createHash("sha256")
      .update(fs.readFileSync("public/media/intro-thunder.mp4"))
      .digest("hex"),
    "9119380e84c331ff197ca1b365c2d305f71897598dac218c217410205dfb3168",
  );
  assert.deepEqual(introMixLevel(2), { volume: 1, boost: 2 });
  assert.deepEqual(introMixLevel(0.8), { volume: 0.8, boost: 1 });
  assert.deepEqual(introMixLevel(0), { volume: 0, boost: 1 });
});
