import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import type { State } from "../lib/model";

test("Todos los espacios incluyen dirección, Maps y galería", () => {
  const state = JSON.parse(
    fs.readFileSync("public/data/seed.json", "utf8"),
  ) as State;
  for (const venue of state.venues) {
    assert.ok(venue.address, venue.name + " sin dirección");
    assert.match(venue.mapsUrl || "", /^https:\/\/www\.google\.com\/maps\//);
    assert.match(venue.photosUrl || "", /tbm=isch/);
  }
});
