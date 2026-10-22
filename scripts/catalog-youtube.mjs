import fs from "node:fs";
export function parseItems(data, kind) {
  const items = new Map();
  let continuation = "";
  function walk(node) {
    if (!node || typeof node !== "object") return;
    const video = node.videoRenderer;
    if (video?.videoId)
      items.set(video.videoId, {
        id: video.videoId,
        title: video.title?.runs?.map((r) => r.text).join("") || "Thinkglao",
        kind,
      });
    const lock = node.lockupViewModel;
    if (lock?.contentId && /^[\w-]{11}$/.test(lock.contentId))
      items.set(lock.contentId, {
        id: lock.contentId,
        title:
          lock.metadata?.lockupMetadataViewModel?.title?.content || "Thinkglao",
        kind,
      });
    const reel = node.reelItemRenderer;
    if (reel?.videoId)
      items.set(reel.videoId, {
        id: reel.videoId,
        title: reel.headline?.simpleText || "Short Thinkglao",
        kind,
      });
    const short = node.shortsLockupViewModel;
    if (short) {
      const id =
        short.onTap?.innertubeCommand?.reelWatchEndpoint?.videoId ||
        short.entityId?.match(/shorts-shelf-item-([\w-]{11})/)?.[1];
      if (id)
        items.set(id, {
          id,
          title:
            short.overlayMetadata?.primaryText?.content || "Short Thinkglao",
          kind,
        });
    }
    const next =
      node.continuationItemRenderer?.continuationEndpoint?.continuationCommand
        ?.token;
    if (next) continuation = next;
    for (const value of Object.values(node))
      if (typeof value === "object") walk(value);
  }
  walk(data);
  return { items: [...items.values()], continuation };
}
export async function harvestCatalog() {
  fs.mkdirSync(".local", { recursive: true });
  const all = [],
    stats = {};
  for (const feed of ["shorts", "videos", "streams"]) {
    const kind = feed === "streams" ? "videos" : feed;
    const response = await fetch(
      "https://www.youtube.com/@ItsTimeToThink/" + feed,
    );
    if (!response.ok) throw Error("YouTube " + response.status);
    const html = await response.text();
    fs.writeFileSync(".local/youtube-" + feed + ".html", html);
    const match = html.match(/var ytInitialData = (.*?);<\/script>/s);
    if (!match) throw Error("Falta catálogo de " + kind);
    const data = JSON.parse(match[1]);
    const configs = [...html.matchAll(/ytcfg\.set\((\{.*?\})\);/gs)].map(
      (m) => {
        try {
          return JSON.parse(m[1]);
        } catch {
          return {};
        }
      },
    );
    const config = Object.assign({}, ...configs);
    const context = config.INNERTUBE_CONTEXT;
    if (!context) throw Error("Falta contexto público del canal");
    const selected =
      data.contents?.twoColumnBrowseResultsRenderer?.tabs?.find(
        (tab) => tab.tabRenderer?.selected,
      )?.tabRenderer?.content || data;
    let parsed = parseItems(selected, kind),
      pages = 1;
    const found = new Map(parsed.items.map((i) => [i.id, i])),
      seen = new Set();
    while (parsed.continuation) {
      if (seen.has(parsed.continuation))
        throw Error(
          "YouTube ha repetido una página; no se publica un catálogo parcial",
        );
      seen.add(parsed.continuation);
      const url =
        "https://www.youtube.com/youtubei/v1/browse?prettyPrint=false" +
        (config.INNERTUBE_API_KEY
          ? "&key=" + encodeURIComponent(config.INNERTUBE_API_KEY)
          : "");
      let next;
      for (let attempt = 0; attempt < 3; attempt++) {
        next = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-YouTube-Client-Name": String(
              config.INNERTUBE_CONTEXT_CLIENT_NAME || 1,
            ),
            "X-YouTube-Client-Version": context.client.clientVersion,
          },
          body: JSON.stringify({ context, continuation: parsed.continuation }),
        });
        if (next.ok) break;
        if (next.status !== 429 && next.status < 500)
          throw Error("Página YouTube " + next.status);
        await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
      }
      if (!next.ok) throw Error("Página YouTube " + next.status);
      parsed = parseItems(await next.json(), kind);
      for (const item of parsed.items) found.set(item.id, item);
      pages++;
      console.log(feed, found.size, "vídeos · página", pages);
    }
    if (!found.size) throw Error("No se han recibido " + kind);
    stats[feed] = { count: found.size, pages, complete: true };
    all.push(...found.values());
  }
  const catalog = {
    source: "https://www.youtube.com/@ItsTimeToThink",
    checkedAt: new Date().toISOString(),
    coverage: stats,
    items: [
      ...new Map(all.map((item) => [item.kind + ":" + item.id, item])).values(),
    ],
  };
  fs.writeFileSync(
    "public/media/youtube.json",
    JSON.stringify(catalog, null, 2) + "\n",
  );
  console.log("Catálogo completo:", JSON.stringify(stats));
  return catalog;
}
if (process.argv[1]?.replaceAll("\\", "/").endsWith("/catalog-youtube.mjs"))
  await harvestCatalog();
