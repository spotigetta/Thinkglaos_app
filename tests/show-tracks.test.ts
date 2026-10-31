import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import crypto from "node:crypto";
import { showTracks, readShowTrack } from "../lib/show-tracks";
test("Las dos canciones de previa conservan los originales y se admiten como selección guardada", () => {
  const originals = [
    [
      "./media/give-me-everything.mp3",
      "7c4a8bff816c794a1429de7aa9886c21aa934c6809a1c1f171a056011f2cd2f9",
    ],
    [
      "./media/sexy-bitch.mp3",
      "24b0e5605569e5376bc4df99db5683fbbb1e4525472d2ef0298a7aa41332adfe",
    ],
  ];
  for (const [url, hash] of originals) {
    assert.ok(showTracks.some((t) => t.url === url));
    assert.equal(readShowTrack(url), url);
    assert.equal(
      crypto
        .createHash("sha256")
        .update(fs.readFileSync("public/" + url.slice(2)))
        .digest("hex"),
      hash,
    );
  }
  assert.equal(
    readShowTrack("https://invalid.example/file.mp3"),
    "./media/levels.mp3",
  );
});
