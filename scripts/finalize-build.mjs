import fs from "node:fs";
import crypto from "node:crypto";
const version = crypto
  .createHash("sha256")
  .update(fs.readFileSync("dist/index.html"))
  .digest("hex")
  .slice(0, 12);
const files = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icon.svg",
  ...fs.readdirSync("dist/assets").map((name) => "./assets/" + name),
  "./data/knowledge.json",
  "./data/seed.json",
  "./media/youtube.json",
  "./media/audio-manolo-whatsapp.mp3",
  "./books/el-secreto-de-la-salsa.pdf",
  ...fs.readdirSync("dist/montage").map((name) => "./montage/" + name),
];
let sw = fs
  .readFileSync("public/sw.js", "utf8")
  .replace("__VERSION__", version)
  .replace("__PRECACHE__", JSON.stringify(files));
fs.writeFileSync("dist/sw.js", sw);
fs.writeFileSync("dist/.nojekyll", "");
console.log("PWA preparada · " + version);
