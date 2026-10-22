import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { harvestCatalog } from "./catalog-youtube.mjs";

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

await harvestCatalog();
execFileSync(process.execPath, ["scripts/prepare-quotes.mjs"], {
  stdio: "inherit",
});
