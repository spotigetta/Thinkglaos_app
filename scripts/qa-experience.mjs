import { chromium } from "@playwright/test";
import fs from "node:fs";
const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({
  viewport: { width: 390, height: 844 },
  isMobile: true,
});
const seed = JSON.parse(fs.readFileSync("public/data/seed.json", "utf8"));
await page.route("https://raw.githubusercontent.com/**", (r) =>
  r.fulfill({ json: seed }),
);
await page.route("https://api.github.com/**", (r) =>
  r.fulfill({
    json: {
      sha: "qa",
      content: Buffer.from(JSON.stringify(seed)).toString("base64"),
    },
  }),
);
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => {
  if (m.type() === "error") console.log("Console:", m.text().slice(0, 200));
});
try {
  await page.goto("http://127.0.0.1:3000/");
  await page
    .getByRole("button", { name: "Libro del voluntario", exact: true })
    .click();
  await page.waitForFunction(
    () => document.querySelector("canvas")?.height > 200,
  );
  await page.waitForTimeout(1000);
  await page.screenshot({ path: ".local/book-cover-mobile.png" });
  await page
    .getByRole("button", { name: "Roles de la noche", exact: true })
    .click();
  await page.waitForTimeout(1200);
  await page.screenshot({ path: ".local/book-roles-mobile.png" });
  console.log(
    "PDF:",
    await page.getByLabel("Página del libro").inputValue(),
    await page.locator(".book-reader [role=alert]").count(),
  );
  await page
    .getByRole("navigation", { name: "Secciones móvil" })
    .getByRole("button", { name: "Plan", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Línea temporal", exact: true })
    .last()
    .click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: ".local/timeline-mobile.png" });
  console.log("Clock:", await page.getByTestId("madrid-clock").innerText());
  console.log(
    "Timeline branches:",
    await page.locator(".timeline-task").count(),
  );
  await page
    .getByRole("navigation", { name: "Secciones móvil" })
    .getByRole("button", { name: "Plan", exact: true })
    .click();
  await page.getByRole("button", { name: "Modo montaje", exact: true }).click();
  await page.waitForTimeout(1000);
  await page.screenshot({ path: ".local/montage-mobile.png" });
  await page.setViewportSize({ width: 1600, height: 1000 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: ".local/montage-desktop.png" });
  console.log(
    "Montage photos:",
    await page.locator(".montage-photo-panel img").getAttribute("src"),
  );
  await page
    .getByRole("button", { name: "Web en directo", exact: true })
    .click();
  await page.waitForTimeout(4000);
  const frame = page
    .frames()
    .find((f) => f.url().includes("itstimetothink.org/thinkglaos"));
  console.log(
    "Web frame:",
    frame
      ? (await frame.locator("body").innerText()).slice(0, 200)
      : "No frame",
  );
  await page.getByRole("button", { name: "Salir del modo montaje" }).click();
  console.log("Errors:", errors);
} finally {
  await browser.close();
}
