import fs from "node:fs";
import { chromium } from "@playwright/test";
fs.mkdirSync("public/books", { recursive: true });
fs.mkdirSync("public/montage", { recursive: true });
fs.copyFileSync(
  "../El_secreto_de_la_salsa.pdf",
  "public/books/el-secreto-de-la-salsa.pdf",
);
const photos = [
  ["110c49_cac4fbf007da497f855693798054b92b~mv2.jpg", "Preparar juntos"],
  [
    "110c49_39800cd79a8442f888c7509ffd2ad9d7~mv2.jpg",
    "Una idea que enciende preguntas",
  ],
  ["110c49_4a041e5018ec45faa0db127958b50af2~mv2.jpg", "Escuchar y conversar"],
  ["110c49_1d84392559b7465f819e7c3406029671~mv2.jpg", "Quedarse un rato más"],
  [
    "dca753_c50b3bd6d48f4b919ebbe4b5f1a2a589~mv2.jpg",
    "Comunidad en movimiento",
  ],
  [
    "dca753_3416e2a455b04c99bcdd366398ce4386~mv2.jpg",
    "La noche la hacemos juntos",
  ],
];
const catalog = [];
for (const [index, [id, caption]] of photos.entries()) {
  const source = "https://static.wixstatic.com/media/" + id;
  const response = await fetch(
    source + "/v1/fill/w_1600,h_1000,al_c,q_85/" + id,
  );
  if (
    !response.ok ||
    !response.headers.get("content-type")?.startsWith("image/")
  )
    throw Error("Imagen " + response.status + " " + source);
  const file = "photo-" + (index + 1) + ".jpg";
  fs.writeFileSync(
    "public/montage/" + file,
    Buffer.from(await response.arrayBuffer()),
  );
  catalog.push({
    src: "./montage/" + file,
    caption,
    source,
    page: "https://www.itstimetothink.org/thinkglaos",
    credit: "IT’S TIME TO THINK · web oficial",
  });
}
const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  const page = await browser.newPage({
    viewport: { width: 1600, height: 1000 },
    deviceScaleFactor: 1,
  });
  const response = await page.goto(
    "https://www.itstimetothink.org/thinkglaos",
    { waitUntil: "domcontentloaded", timeout: 45000 },
  );
  await page.waitForTimeout(3500);
  await page.screenshot({
    path: "public/montage/web-ittt.jpg",
    type: "jpeg",
    quality: 85,
  });
  console.log(
    "Web:",
    response?.status(),
    "iframe:",
    response?.headers()["x-frame-options"] ||
      response?.headers()["content-security-policy"] ||
      "sin restricción declarada",
  );
} finally {
  await browser.close();
}
catalog.push({
  src: "./montage/web-ittt.jpg",
  caption: "El movimiento sigue fuera de esta sala",
  source: "https://www.itstimetothink.org/thinkglaos",
  page: "https://www.itstimetothink.org/thinkglaos",
  credit: "ITTT · vista de su web",
  website: true,
});
fs.writeFileSync(
  "public/montage/photos.json",
  JSON.stringify(
    { checkedAt: new Date().toISOString(), photos: catalog },
    null,
    2,
  ),
);
console.log("Libro original y", catalog.length, "escenas preparados.");
