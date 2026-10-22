import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { parseItems } from "../scripts/catalog-youtube.mjs";
test("Se extrae la continuación junto a las tarjetas del canal", () => {
  const result = parseItems(
    {
      contents: [
        {
          lockupViewModel: {
            contentId: "abcdefghijk",
            metadata: {
              lockupMetadataViewModel: { title: { content: "Una charla" } },
            },
          },
        },
        {
          continuationItemRenderer: {
            continuationEndpoint: {
              continuationCommand: { token: "siguiente-pagina" },
            },
          },
        },
      ],
    },
    "videos",
  );
  assert.equal(result.continuation, "siguiente-pagina");
  assert.equal(result.items[0].id, "abcdefghijk");
});
test("El catálogo no se limita a ocho y las citas conservan su fuente", () => {
  const catalog = JSON.parse(
    fs.readFileSync("public/media/youtube.json", "utf8"),
  );
  assert.ok(
    catalog.coverage.shorts.complete &&
      catalog.coverage.videos.complete &&
      catalog.coverage.streams.complete,
  );
  assert.equal(
    catalog.items.filter((i) => i.kind === "shorts").length,
    catalog.coverage.shorts.count,
  );
  assert.ok(
    catalog.coverage.shorts.pages > 1 && catalog.coverage.videos.pages > 1,
  );
  const quotes = JSON.parse(
    fs.readFileSync("public/media/quotes.json", "utf8"),
  ).items;
  for (const quote of quotes) {
    const source = catalog.items.find((i) => i.id === quote.videoId);
    assert.ok(source);
    assert.ok(source.title.includes(quote.text));
    assert.ok(quote.text.split(/\s+/).length <= 25);
    assert.equal(quote.url, "https://www.youtube.com/watch?v=" + source.id);
  }
  assert.equal(
    new Set(quotes.map((q) => q.text.toLowerCase())).size,
    quotes.length,
  );
});
