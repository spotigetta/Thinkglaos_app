import { test, expect } from "@playwright/test";
test("Mesa en una sola vista, mezcla estable y QR al terminar", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/?control=1");
  await expect(
    page.getByLabel("Voces automáticas", { exact: true }),
  ).toBeChecked();
  await expect(
    page.getByLabel("Mezclar música externa", { exact: true }),
  ).toBeChecked();
  const popup = page.waitForEvent("popup");
  await page
    .getByRole("button", { name: "Abrir proyector ↗", exact: true })
    .click();
  const output = await popup;
  await expect(output.locator(".show-clock")).toBeVisible();
  await expect(output.getByRole("button")).toHaveCount(0);
  await page.getByRole("button", { name: "A sentarse", exact: true }).click();
  await expect(output.locator(".show-output")).toHaveClass(/llamada/);
  await expect
    .poll(() =>
      page
        .locator("audio")
        .nth(1)
        .evaluate((a: HTMLAudioElement) => a.volume),
    )
    .toBeGreaterThan(0.5);
  await page.getByLabel("Buscar frase").fill("Ese fuet no se corta solo");
  await page.locator(".show-cues button").click();
  await expect
    .poll(() =>
      page
        .getByRole("meter", { name: "Voz · señal", exact: true })
        .getAttribute("aria-valuenow"),
    )
    .not.toBe("0");
  await expect
    .poll(() =>
      page
        .locator("audio")
        .nth(1)
        .evaluate((a: HTMLAudioElement) => a.volume),
    )
    .toBeLessThan(0.15);
  const other = await page.context().newPage();
  await other.goto("about:blank");
  await other.bringToFront();
  await page
    .locator("audio")
    .first()
    .evaluate((a: HTMLAudioElement) => {
      a.pause();
      a.dispatchEvent(new Event("ended"));
    });
  await expect
    .poll(() =>
      page
        .locator("audio")
        .nth(1)
        .evaluate((a: HTMLAudioElement) => a.volume),
    )
    .toBeGreaterThan(0.5);
  await page.bringToFront();
  await page.getByRole("button", { name: "Charla", exact: true }).click();
  await expect(output.locator(".show-clock")).toHaveCount(0);
  await page.getByLabel("Posición de la fase").fill("1080");
  await expect(output.getByAltText("QR del grupo de WhatsApp")).toBeVisible();
  await page.getByRole("button", { name: "Pizzas", exact: true }).click();
  await expect(output.getByAltText("QR del grupo de WhatsApp")).toBeVisible();
  await page.getByRole("button", { name: "PARAR TODO", exact: true }).click();
  await expect(
    page.getByLabel("Voces automáticas", { exact: true }),
  ).not.toBeChecked();
  await page.screenshot({ path: ".local/desk-v2.png", fullPage: true });
  await output.screenshot({ path: ".local/qr-stage.png" });
});
test("Vídeos cancelables y animaciones reales sin parpadeo", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/?control=1");
  const popup = page.waitForEvent("popup");
  await page
    .getByRole("button", { name: "Abrir proyector ↗", exact: true })
    .click();
  const output = await popup;
  await expect(page.getByLabel("Vídeos con voz · prueba")).not.toBeChecked();
  await page.getByLabel("Vídeos con voz · prueba").check();
  await page
    .getByRole("button", { name: "Probar vídeo · máximo 30 s" })
    .click();
  await expect(output.locator(".video-takeover")).toBeVisible();
  await page.getByLabel("Vídeos con voz · prueba").uncheck();
  await expect(output.locator(".video-takeover")).toHaveCount(0);
  const before = await output
    .locator(".ticker-track")
    .evaluate((el) => getComputedStyle(el).transform);
  await page.waitForTimeout(600);
  expect(
    await output
      .locator(".ticker-track")
      .evaluate((el) => getComputedStyle(el).transform),
  ).not.toBe(before);
  await page.getByLabel("Animaciones", { exact: true }).uncheck();
  await expect(output.locator(".show-output")).toHaveAttribute(
    "data-motion",
    "off",
  );
});

test("Una única mesa posee el audio y la intro avanza a charla sin reloj de fondo", async ({
  page,
}) => {
  await page.goto("/?control=1");
  await page.getByRole("button", { name: "Activar mesa", exact: true }).click();
  await page.getByRole("button", { name: "A sentarse", exact: true }).click();
  const other = await page.context().newPage();
  await other.goto("/?control=1");
  await other
    .getByRole("button", { name: "Activar mesa", exact: true })
    .click();
  await expect(
    page.getByText("Otra mesa ha tomado el control.", { exact: false }),
  ).toBeVisible();
  await expect
    .poll(() =>
      page
        .locator("audio")
        .nth(1)
        .evaluate((a: HTMLAudioElement) => a.paused),
    )
    .toBe(true);
  const popup = other.waitForEvent("popup");
  await other
    .getByRole("button", { name: "Abrir proyector ↗", exact: true })
    .click();
  const output = await popup;
  await other.getByRole("button", { name: "Intro", exact: true }).click();
  await expect(output.locator(".show-intro")).toBeVisible();
  await output
    .locator(".show-intro")
    .evaluate((v) => v.dispatchEvent(new Event("ended")));
  await expect(output.locator(".show-output")).toHaveClass(/charla/);
  await expect(output.locator(".show-clock")).toHaveCount(0);
  await other.getByRole("button", { name: "Pausar", exact: true }).click();
  const before = await output.locator("h1").textContent();
  await page.waitForTimeout(1100);
  expect(await output.locator("h1").textContent()).toBe(before);
});

test("Selección rápida de voz no permite restauraciones antiguas", async ({
  page,
}) => {
  await page.goto("/?control=1");
  await page.getByRole("button", { name: "Activar mesa", exact: true }).click();
  await page.getByLabel("Voces automáticas", { exact: true }).uncheck();
  await expect(page.locator(".show-cues button")).toHaveCount(141);
  await page.locator(".show-cues button").nth(0).click();
  await page.locator(".show-cues button").nth(1).click();
  await expect(page.locator("audio").first()).toHaveAttribute(
    "src",
    "./media/voces-master-v1/voz-02-pcm-v2.mp3",
  );
  await expect
    .poll(() =>
      page
        .locator("audio")
        .first()
        .evaluate((a: HTMLAudioElement) => !a.paused && a.currentTime > 0),
    )
    .toBe(true);
  await page
    .getByRole("button", { name: "Parar intervención", exact: true })
    .click();
  await expect
    .poll(() =>
      page
        .locator("audio")
        .first()
        .evaluate((a: HTMLAudioElement) => a.paused),
    )
    .toBe(true);
});

test("El montaje muestra el reparto automático hasta las 19:25 y no repite una frase", async ({
  page,
}) => {
  await page.clock.install({ time: new Date("2026-10-29T17:00:00+01:00") });
  await page.goto("/?control=1");
  await expect(page.getByText("Montaje · hasta las 19:25")).toBeVisible();
  await expect(page.getByLabel("Pausa entre locuciones")).toHaveCount(0);
  const pace = page.locator(".montage-pace");
  await expect(pace).toContainText(/frases pendientes · pausa calculada 02:/);
  const before = Number((await pace.textContent())!.match(/(\d+) frases/)![1]);
  await page.getByRole("button", { name: "Activar mesa", exact: true }).click();
  await page.getByRole("button", { name: "Siguiente voz ▶" }).click();
  await page
    .locator("audio")
    .first()
    .evaluate((audio: HTMLAudioElement) => {
      audio.pause();
      audio.dispatchEvent(new Event("ended"));
    });
  await expect(pace).toContainText(`${before - 1} frases pendientes`);
  await page.clock.setFixedTime(new Date("2026-10-29T19:25:01+01:00"));
  await expect(
    page.getByText("19:25 · locuciones de montaje finalizadas"),
  ).toBeVisible();
});

test("El panel completo baja hasta la frase 141 y permite seleccionarla", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 700 });
  await page.goto("/?control=1");
  await expect(page.locator(".show-cues button")).toHaveCount(141);
  const size = await page.evaluate(() => ({
    page: document.documentElement.scrollHeight,
    view: innerHeight,
  }));
  expect(size.page).toBeGreaterThan(size.view * 2);
  await page.getByRole("link", { name: "Frases ↓" }).click();
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(0);
  const last = page.locator(".show-cues button").last();
  await last.scrollIntoViewIfNeeded();
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(1000);
  await last.click();
  await expect
    .poll(() =>
      page
        .locator("audio")
        .first()
        .evaluate((a: HTMLAudioElement) => a.src),
    )
    .toContain("/media/voces-master-v1/");
});

test("Charla y preguntas se pausan, ajustan y terminan sin cambiar de fase, con un aviso por final", async ({
  page,
}) => {
  await page.clock.install({ time: new Date("2026-10-29T20:00:00+01:00") });
  await page.addInitScript(() => {
    (window as any).__chimes = 0;
    const original = AudioContext.prototype.createOscillator;
    AudioContext.prototype.createOscillator = function (...args) {
      (window as any).__chimes++;
      return original.apply(this, args);
    };
  });
  await page.goto("/?control=1");
  const popup = page.waitForEvent("popup");
  await page.getByRole("button", { name: "Abrir proyector ↗" }).click();
  const output = await popup;
  await page.getByRole("button", { name: "Charla", exact: true }).click();
  await expect(output.locator(".show-output")).toHaveClass(/charla/);
  await page.getByRole("button", { name: "Pausar", exact: true }).click();
  const still = await output.locator("h1").textContent();
  await page.clock.fastForward(120000);
  expect(await output.locator("h1").textContent()).toBe(still);
  await page.getByLabel("Posición de la fase").fill("600");
  await expect(output.locator("h1")).toHaveText("08:00");
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await page.getByLabel("Posición de la fase").fill("1079");
  await page.clock.fastForward(2500);
  await expect(output.locator("h1")).toHaveText("00:00");
  await expect(
    page.getByText("Tiempo terminado · esperando tu señal"),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Finalizado" })).toBeDisabled();
  expect(await page.evaluate(() => (window as any).__chimes)).toBe(5);
  await expect(output.locator(".show-output")).toHaveClass(/charla/);
  await expect(output.locator(".show-clock")).toHaveCount(0);
  await output.screenshot({ path: ".local/counter-charla.png" });
  await page.getByRole("button", { name: "Reiniciar", exact: true }).click();
  await expect(output.locator("h1")).toHaveText("18:00");
  await expect(
    page.getByRole("button", { name: "Continuar", exact: true }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "Preguntas", exact: true }).click();
  await page.getByLabel("Posición de la fase").fill("2699");
  await page.clock.fastForward(2500);
  await expect(output.locator("h1")).toHaveText("00:00");
  await expect(output.locator(".show-output")).toHaveClass(/preguntas/);
  expect(await page.evaluate(() => (window as any).__chimes)).toBe(10);
  await page.getByRole("button", { name: "−30 s", exact: true }).click();
  await expect(output.locator("h1")).toHaveText("00:30");
  await expect(
    page.getByRole("button", { name: "Continuar", exact: true }),
  ).toBeEnabled();
});
