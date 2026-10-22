import fs from "node:fs";
import { chromium } from "@playwright/test";
fs.mkdirSync("public/share", { recursive: true });
const photo =
  "data:image/jpeg;base64," +
  fs.readFileSync("public/montage/photo-1.jpg").toString("base64");
const logo =
  "data:image/png;base64," +
  fs.readFileSync("public/assets/ittt.png").toString("base64");
const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  const page = await browser.newPage({
    viewport: { width: 1200, height: 630 },
    deviceScaleFactor: 1,
  });
  await page.setContent(
    `<!doctype html><html><head><style>*{box-sizing:border-box}body{margin:0;width:1200px;height:630px;overflow:hidden;background:#f8f2d9;font-family:'Segoe UI',Arial,sans-serif;color:#24291f}.bg{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:.08}.card{position:absolute;inset:26px;border:1px solid #d9cfaa;border-radius:30px;background:linear-gradient(115deg,#fffdf4 25%,#eedea8);overflow:hidden}.brand{position:absolute;left:40px;top:34px;width:190px;height:60px;object-fit:contain}.city{position:absolute;top:60px;right:38px;font-size:16px;font-weight:700;letter-spacing:4px;color:#6b735b}.copy{position:absolute;left:44px;top:130px;width:620px;z-index:2}h1{font-size:84px;line-height:.96;letter-spacing:-5px;margin:14px 0 22px;font-weight:900}h1 span{color:#728052}.tag{font-size:16px;letter-spacing:3px;color:#867542;font-weight:700}.copy p{font-size:25px;line-height:1.35;width:530px;color:#59614b}.pills{display:flex;gap:10px;margin-top:24px}.pills span{padding:9px 17px;border-radius:20px;background:#2c3525;color:#fff;font-size:16px}.photo{position:absolute;right:-34px;top:143px;width:455px;height:470px;object-fit:cover;border:10px solid #fff;border-radius:28px;transform:rotate(7deg);box-shadow:0 15px 35px #2e372433}.footer{position:absolute;left:44px;bottom:28px;font-size:15px;color:#69715b}</style></head><body><img class="bg" src="${photo}"><div class="card"><img class="brand" src="${logo}"><span class="city">TOLEDO</span><div class="copy"><span class="tag">IT’S TIME TO THINK</span><h1>THINKGLAOS<br><span>EL EQUIPO.</span></h1><p>Las personas que hacen<br>posible cada encuentro.</p><div class="pills"><span>Tareas</span><span>Libro</span><span>Vídeos</span><span>Comunidad</span></div></div><img class="photo" src="${photo}"><span class="footer">Organízate. Participa. Comparte.</span></div></body></html>`,
    { waitUntil: "load" },
  );
  await page.screenshot({
    path: "public/share/thinkglaos-toledo.jpg",
    type: "jpeg",
    quality: 90,
  });
  console.log(
    "Miniatura generada: 1200 × 630 ·",
    fs.statSync("public/share/thinkglaos-toledo.jpg").size,
    "bytes",
  );
} finally {
  await browser.close();
}
