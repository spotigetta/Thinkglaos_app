import fs from "node:fs";
const catalog = JSON.parse(
  fs.readFileSync("public/media/youtube.json", "utf8"),
);
const seen = new Set(),
  quotes = [];
for (const item of catalog.items) {
  const matches = [...item.title.matchAll(/[«“"]([^»”"]{15,220})[»”"]/g)];
  for (const match of matches) {
    const text = match[1].trim();
    const key = text.toLocaleLowerCase("es");
    if (
      seen.has(key) ||
      text.split(/\s+/).length > 25 ||
      text.split(/\s+/).length < 4
    )
      continue;
    seen.add(key);
    const speaker = item.title
      .match(/(?:Thinkglao|Thinkglaos)\s+con\s+([^|:]+)(?:$|[|:])/i)?.[1]
      ?.trim();
    quotes.push({
      id: item.id,
      text,
      videoId: item.id,
      sourceTitle: item.title,
      url: "https://www.youtube.com/watch?v=" + item.id,
      provenance: "Cita destacada en el título oficial de ITTT",
      ...(speaker ? { speaker } : {}),
      kind: item.kind,
    });
    break;
  }
}
fs.writeFileSync(
  "public/media/quotes.json",
  JSON.stringify(
    {
      source: catalog.source,
      checkedAt: catalog.checkedAt,
      method:
        "Solo citas entrecomilladas de títulos oficiales. No se presentan como transcripciones verificadas.",
      items: quotes,
    },
    null,
    2,
  ) + "\n",
);
console.log("Citas con fuente:", quotes.length);
console.log(
  quotes
    .slice(0, 8)
    .map((q) => ({ text: q.text, speaker: q.speaker, videoId: q.videoId })),
);
