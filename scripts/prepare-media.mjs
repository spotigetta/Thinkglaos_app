import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

fs.mkdirSync("public/media", { recursive: true });
const binaries = ".local/audio-tools/imageio_ffmpeg/binaries";
const ffmpeg = path.resolve(
  binaries,
  fs.readdirSync(binaries).find((f) => f.endsWith(".exe")),
);
const input = path.resolve(
  "../Videos promocionales/Audio Manolo Lama Promo Thinkglaos.mp4",
);
execFileSync(
  ffmpeg,
  [
    "-y",
    "-i",
    input,
    "-map",
    "0:a:0",
    "-vn",
    "-codec:a",
    "libmp3lame",
    "-b:a",
    "128k",
    "-metadata",
    "title=Manolo Lama · Thinkglaos",
    "public/media/audio-manolo-whatsapp.mp3",
  ],
  { stdio: "pipe" },
);
// The small original is also served from Pages for reliable inline playback.
fs.copyFileSync(input, "public/media/manolo-original.mp4");
fs.copyFileSync(
  "public/media/audio-manolo-whatsapp.mp3",
  path.resolve("../Videos promocionales/Audio Manolo Lama - WhatsApp.mp3"),
);
console.log(
  "MP3 creado:",
  fs.statSync("public/media/audio-manolo-whatsapp.mp3").size,
  "bytes",
);

const items = [];
for (const kind of ["shorts", "videos"]) {
  const response = await fetch(
    "https://www.youtube.com/@ItsTimeToThink/" + kind,
  );
  if (!response.ok) throw Error("YouTube " + response.status);
  const html = await response.text();
  fs.writeFileSync(".local/youtube-" + kind + ".html", html);
  const match = html.match(/var ytInitialData = (.*?);<\/script>/s);
  if (!match) throw Error("No se encuentra el catálogo público de YouTube");
  const data = JSON.parse(match[1]);
  const found = new Map();
  function walk(node) {
    if (!node || typeof node !== "object") return;
    const renderer = node.videoRenderer;
    if (renderer?.videoId)
      found.set(renderer.videoId, {
        id: renderer.videoId,
        title: renderer.title?.runs?.map((r) => r.text).join("") || "Thinkglao",
        kind,
      });
    const lock = node.lockupViewModel;
    if (lock?.contentId && /^[\w-]{11}$/.test(lock.contentId))
      found.set(lock.contentId, {
        id: lock.contentId,
        title:
          lock.metadata?.lockupMetadataViewModel?.title?.content ||
          "Conversación Thinkglao",
        kind,
      });
    const reel = node.reelItemRenderer;
    if (reel?.videoId)
      found.set(reel.videoId, {
        id: reel.videoId,
        title:
          reel.headline?.simpleText ||
          reel.accessibility?.accessibilityData?.label ||
          "Short Thinkglao",
        kind,
      });
    const short = node.shortsLockupViewModel;
    if (short) {
      const id =
        short.onTap?.innertubeCommand?.reelWatchEndpoint?.videoId ||
        short.entityId?.match(/shorts-shelf-item-([\w-]{11})/)?.[1];
      if (id)
        found.set(id, {
          id,
          title:
            short.overlayMetadata?.primaryText?.content || "Short Thinkglao",
          kind,
        });
    }
    for (const value of Object.values(node))
      if (typeof value === "object") walk(value);
  }
  walk(data);
  console.log(kind, found.size);
  items.push(...[...found.values()].slice(0, 8));
}
if (
  !items.some((i) => i.kind === "shorts") ||
  !items.some((i) => i.kind === "videos")
)
  throw Error("Falta catálogo de Shorts o vídeos");
fs.writeFileSync(
  "public/media/youtube.json",
  JSON.stringify(
    {
      source: "https://www.youtube.com/@ItsTimeToThink",
      checkedAt: new Date().toISOString(),
      items,
    },
    null,
    2,
  ),
);
