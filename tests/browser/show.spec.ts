import { test, expect } from "@playwright/test";
test("La mesa controla la proyección limpia, temporizadores e intro reversible", async ({
  page,
}) => {
  await page.goto("/?control=1");
  const popup = page.waitForEvent("popup");
  await page.getByRole("button", { name: "Abrir proyector ↗" }).click();
  const output = await popup;
  await expect(output.locator(".show-clock")).toBeVisible();
  await expect(output.getByRole("button")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Charla · 18 min", exact: true })
    .click();
  await expect(output.locator("h1")).toContainText("17:");
  await expect(output.locator(".show-clock")).toHaveCount(0);
  await expect(output.getByAltText("IT’S TIME TO THINK")).toBeVisible();
  await expect(output.locator(".show-speaker img")).toHaveAttribute(
    "src",
    "./share/laura-rodriguez.jpg",
  );
  await page.getByRole("button", { name: "Pausar", exact: true }).click();
  const before = await output.locator("h1").textContent();
  await page.waitForTimeout(1100);
  expect(await output.locator("h1").textContent()).toBe(before);
  await page.getByLabel("Posición de la fase").fill("60");
  await expect(output.locator("h1")).toHaveText("17:00");
  await page
    .getByRole("button", { name: "Reiniciar fase", exact: true })
    .click();
  await expect(output.locator("h1")).toHaveText("18:00");
  await page
    .getByRole("button", { name: "Preguntas · 45 min", exact: true })
    .click();
  await expect(output.locator("h1")).toContainText("44:");
  await page.getByRole("button", { name: "Lanzar intro", exact: true }).click();
  await expect(output.locator(".show-intro")).toHaveAttribute(
    "src",
    "./media/intro-thunder.mp4",
  );
  await output
    .locator(".show-intro")
    .evaluate((v) => v.dispatchEvent(new Event("ended")));
  await expect(output.locator("h1")).toContainText("17:");
  await page.getByRole("button", { name: "Ambiente", exact: true }).click();
  await expect(output.locator(".show-output")).toHaveClass(/ambiente/);
  await page
    .getByRole("button", { name: "Que se sienten", exact: true })
    .click();
  await expect(output.locator(".show-output")).toHaveClass(/llamada/);
  await expect(page.locator(".show-cues button")).toHaveCount(37);
});

test("Una frase seleccionada suena completa desde la mesa sin proyector ni música", async ({
  page,
}) => {
  await page.goto("/?control=1");
  await expect(page.locator(".show-cues button")).toHaveCount(37);
  await page.getByLabel("Buscar frase").fill("Esta noche está permitido");
  await page.locator(".show-cues button").click();
  const voice = page.locator("audio");
  await expect(voice).toHaveAttribute(
    "src",
    "./media/locuciones/voz-02-pcm-v2.mp3",
  );
  await expect
    .poll(() => voice.evaluate((a: HTMLAudioElement) => a.currentTime))
    .toBeGreaterThan(0.1);
  await expect(page.locator(".dj-live")).toContainText(
    "Esta noche está permitido",
  );
  await page.getByRole("button", { name: "Parar voz ■" }).click();
  await expect
    .poll(() => voice.evaluate((a: HTMLAudioElement) => a.paused))
    .toBe(true);
  await page.getByLabel("Buscar frase").fill("¡TRES!");
  await page.locator(".show-cues button").click();
  await expect(voice).toHaveAttribute(
    "src",
    "./media/locuciones/voz-37-pcm-v2.mp3",
  );
  await expect
    .poll(() => voice.evaluate((a: HTMLAudioElement) => a.currentTime))
    .toBeGreaterThan(0.1);
});
