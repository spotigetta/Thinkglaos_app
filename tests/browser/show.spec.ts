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
  const firstAlarm = await page.evaluate(() => (window as any).__chimes);
  expect(firstAlarm).toBeGreaterThan(20);
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
  expect(await page.evaluate(() => (window as any).__chimes)).toBe(
    firstAlarm * 2,
  );
  await page.getByRole("button", { name: "−30 s", exact: true }).click();
  await expect(output.locator("h1")).toHaveText("00:30");
  await expect(
    page.getByRole("button", { name: "Continuar", exact: true }),
  ).toBeEnabled();
});

test("Intro limpia y cronómetros con amarillo ITTT, modo oscuro sincronizado y persistente", async ({
  page,
}) => {
  await page.goto("/?control=1");
  const popup = page.waitForEvent("popup");
  await page.getByRole("button", { name: "Abrir proyector ↗" }).click();
  const out = await popup;
  await page.getByRole("button", { name: "Intro", exact: true }).click();
  await expect(out.locator(".show-intro")).toBeVisible();
  await expect(out.locator(".show-clock")).toHaveCount(0);
  await expect(out.locator(".show-brand")).toHaveCount(0);
  await page.getByRole("button", { name: "Charla", exact: true }).click();
  await expect(out.locator(".show-output")).toHaveAttribute(
    "data-counter-theme",
    "light",
  );
  await expect(out.locator(".show-output")).toHaveCSS(
    "background-color",
    "rgb(254, 225, 133)",
  );
  await out.screenshot({ path: ".local/counter-yellow.png" });
  await page.getByLabel("Modo oscuro de cronómetros").check();
  await expect(out.locator(".show-output")).toHaveAttribute(
    "data-counter-theme",
    "dark",
  );
  await expect(out.locator(".show-output")).toHaveCSS(
    "background-color",
    "rgb(0, 0, 0)",
  );
  await out.screenshot({ path: ".local/counter-dark.png" });
  await page.reload();
  await expect(page.getByLabel("Modo oscuro de cronómetros")).toBeChecked();
});

test("Pizzas duran una hora y el QR convive con mensajes animados que siguen cambiando", async ({
  page,
}) => {
  await page.goto("/?control=1");
  const popup = page.waitForEvent("popup");
  await page.getByRole("button", { name: "Abrir proyector ↗" }).click();
  const out = await popup;
  await page.getByRole("button", { name: "Pizzas", exact: true }).click();
  await expect(
    page.getByText("Pizzas · una hora", { exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("Posición de la fase")).toHaveAttribute(
    "max",
    "3600",
  );
  await expect(page.getByLabel("Pausa entre locuciones")).toHaveCount(0);
  await expect(out.getByAltText("QR del grupo de WhatsApp")).toBeVisible();
  await expect(out.locator(".qr-live-copy")).toBeVisible();
  const qr = await out.getByAltText("QR del grupo de WhatsApp").boundingBox(),
    copy = await out.locator(".qr-live-copy").boundingBox();
  expect(qr!.x).toBeGreaterThan(copy!.x + copy!.width);
  await out.screenshot({ path: ".local/community-pizzas.png" });
  await page.getByRole("button", { name: "Charla", exact: true }).click();
  await page.getByLabel("Posición de la fase").fill("1080");
  await expect(out.locator(".community-scene")).toBeVisible();
  const before = await out.locator(".qr-live-copy h2").textContent();
  await out.clock.install();
  await out.clock.fastForward(15000);
  await expect(out.locator(".qr-live-copy h2")).not.toHaveText(before!);
  await expect(out.locator(".show-output")).not.toHaveClass(/scene-paused/);
});

test("El aviso musical dura 30 segundos y se puede detener sin cambiar el contador", async ({
  page,
}) => {
  await page.goto("/?control=1");
  await page.getByRole("button", { name: "Charla", exact: true }).click();
  await page.getByRole("button", { name: "Pausar", exact: true }).click();
  const before = await page.locator(".console-transport strong").textContent();
  await page
    .getByRole("button", { name: "Probar aviso musical · 30 s ♪" })
    .click();
  await expect(
    page.getByRole("button", { name: /Detener aviso/ }),
  ).toBeVisible();
  await page.getByRole("button", { name: /Detener aviso/ }).click();
  await expect(
    page.getByRole("button", { name: "Probar aviso musical · 30 s ♪" }),
  ).toBeVisible();
  expect(await page.locator(".console-transport strong").textContent()).toBe(
    before,
  );
  await page
    .getByRole("button", { name: "Probar aviso musical · 30 s ♪" })
    .click();
  await page.getByRole("button", { name: "Preguntas", exact: true }).click();
  await expect(page.getByRole("button", { name: /Detener aviso/ })).toHaveCount(
    0,
  );
});

test("Pausar, reiniciar o ajustar no libera la música externa de la escena", async ({
  page,
}) => {
  await page.addInitScript(() => {
    (window as any).__mixOrders = [];
    window.addEventListener("message", (e) => {
      if (e.source === window && e.data?.type === "ITTT_MUSIC_TARGET") {
        (window as any).__mixOrders.push(e.data.level);
        (window as any).__lastMixGoal = e.data.level;
        (window as any).__lastPlaybackStop = e.data.stopPlayback;
      }
    });
  });
  await page.goto("/?control=1");
  await page.getByRole("button", { name: "Activar mesa", exact: true }).click();
  await page.evaluate(() =>
    window.postMessage(
      { type: "ITTT_MUSIC_READY", version: 2.2 },
      location.origin,
    ),
  );
  for (const scene of ["Intro", "Charla", "Preguntas", "A sentarse"]) {
    await page.getByRole("button", { name: scene, exact: true }).click();
    await expect
      .poll(() => page.evaluate(() => (window as any).__lastMixGoal))
      .toBe(0);
    expect(await page.evaluate(() => (window as any).__lastPlaybackStop)).toBe(
      scene !== "A sentarse",
    );
    await page.evaluate(() => ((window as any).__mixOrders = []));
    await page.getByRole("button", { name: "Pausar", exact: true }).click();
    await page.getByLabel("Posición de la fase").fill("30");
    await page.getByRole("button", { name: "Reiniciar", exact: true }).click();
    await page
      .locator("audio")
      .first()
      .evaluate((a) => a.dispatchEvent(new Event("ended")));
    await page.waitForTimeout(250);
    expect(
      await page.evaluate(() =>
        (window as any).__mixOrders.every((v: number) => v === 0),
      ),
    ).toBe(true);
  }
});

test("La intro conserva el original con un refuerzo general independiente de las voces", async ({
  page,
}) => {
  await page.goto("/?control=1");
  await page.getByLabel("Volumen de voces").fill("0.2");
  const popup = page.waitForEvent("popup");
  await page.getByRole("button", { name: "Abrir proyector ↗" }).click();
  const out = await popup;
  await page.getByRole("button", { name: "Intro", exact: true }).click();
  await expect(out.locator(".show-intro")).toHaveAttribute(
    "src",
    "./media/intro-thunder.mp4",
  );
  await expect
    .poll(() =>
      out.locator(".show-intro").evaluate((v: HTMLVideoElement) => v.volume),
    )
    .toBe(1);
  await expect
    .poll(
      () =>
        page
          .getByRole("meter", { name: "Intro · señal" })
          .getAttribute("aria-valuenow"),
      { timeout: 10000 },
    )
    .not.toBe("0");
  await page.getByLabel("Volumen de intro").fill("0.8");
  await expect
    .poll(() =>
      out.locator(".show-intro").evaluate((v: HTMLVideoElement) => v.volume),
    )
    .toBe(0.8);
  await expect(page.getByLabel("Volumen de voces")).toHaveValue("0.2");
  await page.getByRole("button", { name: "Pausar", exact: true }).click();
  await expect
    .poll(() =>
      out.locator(".show-intro").evaluate((v: HTMLVideoElement) => v.paused),
    )
    .toBe(true);
});

test("Pausar una locución conserva la música baja y continuar retoma esa voz", async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.addEventListener("message", (e) => {
      if (e.source === window && e.data?.type === "ITTT_MUSIC_TARGET")
        (window as any).__goal = e.data.level;
    });
  });
  await page.goto("/?control=1");
  await page.getByRole("button", { name: "Activar mesa", exact: true }).click();
  await page.getByLabel("Voces automáticas", { exact: true }).uncheck();
  await page.evaluate(() =>
    window.postMessage(
      { type: "ITTT_MUSIC_READY", version: 2.2 },
      location.origin,
    ),
  );
  await page.getByLabel("Buscar frase").fill("Esta noche está permitido");
  await page.locator(".show-cues button").click();
  await expect
    .poll(() =>
      page
        .locator("audio")
        .first()
        .evaluate((a: HTMLAudioElement) => a.currentTime),
    )
    .toBeGreaterThan(0);
  await expect
    .poll(() => page.evaluate(() => (window as any).__goal))
    .toBe(0.12);
  await page.getByRole("button", { name: "Pausar", exact: true }).click();
  const frozen = await page
    .locator("audio")
    .first()
    .evaluate((a: HTMLAudioElement) => a.currentTime);
  await page.waitForTimeout(600);
  expect(await page.evaluate(() => (window as any).__goal)).toBe(0.12);
  expect(
    await page
      .locator("audio")
      .first()
      .evaluate((a: HTMLAudioElement) => a.paused),
  ).toBe(true);
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await expect
    .poll(() =>
      page
        .locator("audio")
        .first()
        .evaluate((a: HTMLAudioElement) => a.currentTime),
    )
    .toBeGreaterThan(frozen + 0.05);
  expect(await page.evaluate(() => (window as any).__goal)).toBe(0.12);
});

test("Las vibes reaccionan a audio real de una pestaña, permiten umbral y estilos, y se apagan al instante", async ({
  page,
}) => {
  await page.addInitScript(() => {
    navigator.mediaDevices.getDisplayMedia = async () => {
      const ac = new AudioContext(),
        osc = ac.createOscillator(),
        gain = ac.createGain(),
        out = ac.createMediaStreamDestination();
      osc.frequency.value = 80;
      gain.gain.value = 0.55;
      osc.connect(gain).connect(out);
      osc.start();
      await ac.resume();
      (window as any).__vibesStream = out.stream;
      return out.stream;
    };
  });
  await page.goto("/?control=1");
  const popup = page.waitForEvent("popup");
  await page.getByRole("button", { name: "Abrir proyector ↗" }).click();
  const out = await popup;
  await expect(
    page.getByLabel("Vibes al ritmo de la música"),
  ).not.toBeChecked();
  await page.getByLabel("Vibes al ritmo de la música").check();
  await page.getByLabel("Escenas de vibes").selectOption("all");
  await page.getByLabel("Umbral de graves").fill("1");
  await page
    .getByRole("button", { name: "Conectar audio de YouTube / Spotify" })
    .click();
  await expect(
    page.getByRole("button", { name: "Desconectar pestaña musical" }),
  ).toBeVisible();
  await expect
    .poll(() =>
      page
        .getByRole("meter", { name: "Señal de graves (45–150 Hz)" })
        .getAttribute("aria-valuenow"),
    )
    .not.toBe("0");
  await page.waitForTimeout(800);
  await expect(out.getByTestId("music-vibes")).toHaveCount(0);
  await page.getByLabel("Inversión total", { exact: true }).check();
  await page.getByLabel("Umbral de graves").fill("0.02");
  await expect(out.locator(".vibe-contrast")).toHaveCount(1);
  await page
    .getByLabel("Inversión total", { exact: true })
    .uncheck()
    .catch(() => {});
  await page.getByLabel("Anillos", { exact: true }).check();
  await page.getByLabel("Inversión total", { exact: true }).uncheck();
  await page.getByRole("button", { name: "Probar pulso" }).click();
  await expect(out.locator(".vibe-shapes")).toHaveCount(1);
  await out.waitForTimeout(150);
  await out.screenshot({ path: ".local/vibes-shapes.png" });
  await page.getByLabel("Vibes al ritmo de la música").uncheck();
  await expect(out.getByTestId("music-vibes")).toHaveCount(0);
  expect(
    await page.evaluate(() =>
      (window as any).__vibesStream
        .getTracks()
        .every((t: MediaStreamTrack) => t.readyState === "ended"),
    ),
  ).toBe(true);
});

test("La intro mantiene el vídeo original y un refuerzo uniforme de 200 por ciento", async ({
  page,
}) => {
  await page.goto("/?control=1");
  await expect(page.getByLabel("Volumen de intro")).toHaveValue("2");
  await expect(page.getByLabel("Volumen de intro")).toHaveAttribute("max", "3");
  const popup = page.waitForEvent("popup");
  await page.getByRole("button", { name: "Abrir proyector ↗" }).click();
  const out = await popup;
  await page.getByLabel("Vibes al ritmo de la música").check();
  await page.getByLabel("Escenas de vibes").selectOption("all");
  await page.getByRole("button", { name: "Intro", exact: true }).click();
  await expect(out.locator(".show-intro")).toHaveAttribute(
    "src",
    "./media/intro-thunder.mp4",
  );
  await page.getByRole("button", { name: "Probar pulso" }).click();
  await expect(out.getByTestId("music-vibes")).toHaveCount(0);
});

test("Las vibes de A sentarse leen la música local automáticamente", async ({
  page,
}) => {
  await page.goto("/?control=1");
  const popup = page.waitForEvent("popup");
  await page.getByRole("button", { name: "Abrir proyector ↗" }).click();
  const out = await popup;
  await page.getByLabel("Vibes al ritmo de la música").check();
  await expect(page.getByLabel("Escenas de vibes")).toHaveValue("llamada");
  await page.getByLabel("Halos", { exact: true }).check();
  await page.getByLabel("Inversión total", { exact: true }).uncheck();
  await page.getByLabel("Umbral de graves").fill("0.02");
  await page.getByRole("button", { name: "A sentarse", exact: true }).click();
  await expect
    .poll(async () =>
      Number(
        await page
          .getByRole("meter", { name: "Señal de graves (45–150 Hz)" })
          .getAttribute("aria-valuenow"),
      ),
    )
    .toBeGreaterThan(0);
  await expect(out.locator(".vibe-halo")).toHaveCount(1, { timeout: 10000 });
  await page.getByRole("button", { name: "PARAR TODO", exact: true }).click();
  await expect(
    page.getByLabel("Vibes al ritmo de la música"),
  ).not.toBeChecked();
  await expect(out.getByTestId("music-vibes")).toHaveCount(0);
});

test("El flash invierte todos los colores al cien por cien y vuelve limpio en un pulso proporcional", async ({
  page,
}) => {
  await page.goto("/?control=1");
  const popup = page.waitForEvent("popup");
  await page.getByRole("button", { name: "Abrir proyector ↗" }).click();
  const out = await popup;
  await page.getByRole("button", { name: "Charla", exact: true }).click();
  await page.getByRole("button", { name: "Pausar", exact: true }).click();
  await page.getByLabel("Vibes al ritmo de la música").check();
  await expect(
    page.getByLabel("Inversión total", { exact: true }),
  ).toBeChecked();
  await page.getByLabel("Escenas de vibes").selectOption("counters");
  await page.getByLabel("Intensidad base de vibes").fill("0.5");
  await page.getByRole("button", { name: "Probar pulso" }).click();
  const flash = out.locator(".vibe-contrast");
  await expect(flash).toHaveCount(1);
  const active = await flash.evaluate((el) => {
    const animation = el.getAnimations()[0];
    animation.pause();
    animation.currentTime = 40;
    const s = getComputedStyle(el);
    return {
      opacity: s.opacity,
      blend: s.mixBlendMode,
      duration: s.animationDuration,
      play: s.animationPlayState,
    };
  });
  expect(active.opacity).toBe("1");
  expect(active.blend).toBe("difference");
  expect(active.duration).toBe("0.18s");
  expect(active.play).toBe("running");
  await out.screenshot({ path: ".local/full-inversion.png" });
  await flash.evaluate((el) => {
    el.getAnimations()[0].currentTime = 181;
  });
  await expect(flash).toHaveCSS("opacity", "0");
  await page.getByLabel("Vibes al ritmo de la música").uncheck();
  await expect(out.getByTestId("music-vibes")).toHaveCount(0);
});

test("Un agudo fuerte no dispara el flash, pero un grave más suave sí", async ({
  page,
}) => {
  await page.addInitScript(() => {
    navigator.mediaDevices.getDisplayMedia = async () => {
      const ac = new AudioContext(),
        osc = ac.createOscillator(),
        gain = ac.createGain(),
        out = ac.createMediaStreamDestination();
      osc.frequency.value = 2000;
      gain.gain.value = 0.8;
      osc.connect(gain).connect(out);
      osc.start();
      await ac.resume();
      (window as any).__bassTest = { ac, osc, gain };
      return out.stream;
    };
  });
  await page.goto("/?control=1");
  const popup = page.waitForEvent("popup");
  await page.getByRole("button", { name: "Abrir proyector ↗" }).click();
  const out = await popup;
  await page.getByLabel("Vibes al ritmo de la música").check();
  await page.getByLabel("Escenas de vibes").selectOption("all");
  await page.getByLabel("Umbral de graves").fill("0.3");
  await page
    .getByRole("button", { name: "Conectar audio de YouTube / Spotify" })
    .click();
  await page.waitForTimeout(1000);
  expect(
    Number(
      await page
        .getByRole("meter", { name: "Señal de graves (45–150 Hz)" })
        .getAttribute("aria-valuenow"),
    ),
  ).toBeLessThan(0.1);
  await expect(out.getByTestId("music-vibes")).toHaveCount(0);
  await page.evaluate(() => {
    const { ac, osc, gain } = (window as any).__bassTest;
    gain.gain.setValueAtTime(0.15, ac.currentTime);
    osc.frequency.setValueAtTime(80, ac.currentTime);
  });
  await expect(out.locator(".vibe-contrast")).toHaveCount(1);
  await expect
    .poll(async () =>
      Number(
        await page
          .getByRole("meter", { name: "Señal de graves (45–150 Hz)" })
          .getAttribute("aria-valuenow"),
      ),
    )
    .toBeGreaterThan(0.3);
  await page.getByLabel("Vibes al ritmo de la música").uncheck();
});
test("Selección múltiple, variación por minutos, persistencia y nuevos grafismos con texto reactivo", async ({
  page,
}) => {
  await page.goto("/?control=1");
  const popup = page.waitForEvent("popup");
  await page.getByRole("button", { name: "Abrir proyector ↗" }).click();
  const out = await popup;
  await page.getByLabel("Vibes al ritmo de la música").check();
  await page.getByLabel("Prisma", { exact: true }).check();
  await page.getByLabel("Túnel", { exact: true }).check();
  await page.getByLabel("Inversión total", { exact: true }).uncheck();
  await page.getByLabel("Variación de vibes").selectOption("minutes");
  await page.getByLabel("Minutos entre efectos").fill("0.25");
  await page.getByLabel("Intensidad base de vibes").fill("0.3");
  await page.getByRole("button", { name: "Probar pulso" }).click();
  await expect(out.locator(".vibe-prism, .vibe-tunnel")).toHaveCount(1);
  expect(
    await out.locator("main h1").evaluate((el) => el.getAnimations().length),
  ).toBeGreaterThan(0);
  await page.reload();
  await expect(page.getByLabel("Prisma", { exact: true })).toBeChecked();
  await expect(page.getByLabel("Túnel", { exact: true })).toBeChecked();
  await expect(
    page.getByLabel("Inversión total", { exact: true }),
  ).not.toBeChecked();
  await expect(page.getByLabel("Variación de vibes")).toHaveValue("minutes");
  await expect(page.getByLabel("Intensidad base de vibes")).toHaveValue("0.3");
  // Inspect each new shader-like CSS effect in the actual projector.
  for (const [name, cls] of [
    ["Prisma", "prism"],
    ["Túnel", "tunnel"],
    ["Rayos", "rays"],
  ]) {
    await page.getByLabel(name, { exact: true }).check();
    for (const other of ["Prisma", "Túnel", "Rayos"].filter((x) => x !== name))
      await page.getByLabel(other, { exact: true }).uncheck();
    await page.getByRole("button", { name: "Probar pulso" }).click();
    await expect(out.locator(`.vibe-${cls}`)).toHaveCount(1);
    await out.waitForTimeout(70);
    expect(
      await out
        .locator(`.vibe-${cls} i`)
        .first()
        .evaluate((el) => el.getAnimations().length),
    ).toBeGreaterThan(0);
  }
});
test("Los tres porcentajes de locuciones se guardan y cero cancela nuevas frases automáticas", async ({
  page,
}) => {
  await page.goto("/?control=1");
  await page.getByRole("button", { name: "Ambientillo", exact: true }).click();
  for (const scene of ["Montaje", "Ambientillo", "Pizzas"])
    await page
      .getByLabel("Cantidad de frases de " + scene, { exact: true })
      .fill("67");
  await expect(
    page.locator(".voice-coverage").filter({ hasText: "Ambientillo" }),
  ).toContainText("67%");
  await expect(page.locator(".montage-pace")).toContainText("Ambientillo");
  await page
    .getByLabel("Cantidad de frases de Ambientillo", { exact: true })
    .fill("0");
  await expect(page.locator(".voice-now")).toContainText(
    "selección completada",
  );
  await page.reload();
  await expect(
    page.getByLabel("Cantidad de frases de Montaje", { exact: true }),
  ).toHaveValue("67");
  await expect(
    page.getByLabel("Cantidad de frases de Ambientillo", { exact: true }),
  ).toHaveValue("0");
  await expect(
    page.getByLabel("Cantidad de frases de Pizzas", { exact: true }),
  ).toHaveValue("67");
});
test("Aurora reacciona a medios y agudos con capas continuas sin reiniciar en cada muestra", async ({
  page,
}) => {
  await page.addInitScript(() => {
    navigator.mediaDevices.getDisplayMedia = async () => {
      const ac = new AudioContext(),
        osc = ac.createOscillator(),
        gain = ac.createGain(),
        out = ac.createMediaStreamDestination();
      osc.frequency.value = 2000;
      gain.gain.value = 0.8;
      osc.connect(gain).connect(out);
      osc.start();
      await ac.resume();
      (window as any).__spectralTest = { ac, osc, gain };
      return out.stream;
    };
  });
  await page.goto("/?control=1");
  const popup = page.waitForEvent("popup");
  await page.getByRole("button", { name: "Abrir proyector ↗" }).click();
  const out = await popup;
  await page.getByLabel("Vibes al ritmo de la música").check();
  await page.getByLabel("Aurora espectral", { exact: true }).check();
  await page.getByLabel("Inversión total", { exact: true }).uncheck();
  await page.getByLabel("Escenas de vibes").selectOption("all");
  await page
    .getByRole("button", {
      name: "Conectar audio de YouTube / Spotify",
      exact: true,
    })
    .click();
  await expect(out.locator(".vibe-aurora > i")).toHaveCount(8);
  await expect
    .poll(async () =>
      Number(
        await page
          .getByRole("meter", { name: "Banda Presencia", exact: true })
          .getAttribute("aria-valuenow"),
      ),
    )
    .toBeGreaterThan(0.1);
  const values = await out.locator(".vibe-aurora").evaluate((el) => {
    (el as any).__identity = "same-node";
    return {
      high: Number((el as HTMLElement).style.getPropertyValue("--high")),
      bass: Number((el as HTMLElement).style.getPropertyValue("--bass")),
    };
  });
  expect(values.high).toBeGreaterThan(0.1);
  expect(values.bass).toBeLessThan(0.02);
  await out.waitForTimeout(400);
  expect(
    await out.locator(".vibe-aurora").evaluate((el) => (el as any).__identity),
  ).toBe("same-node");
  await page.evaluate(() =>
    (window as any).__spectralTest.osc.frequency.setValueAtTime(
      80,
      (window as any).__spectralTest.ac.currentTime,
    ),
  );
  await expect
    .poll(async () =>
      Number(
        await page
          .getByRole("meter", { name: "Banda Graves", exact: true })
          .getAttribute("aria-valuenow"),
      ),
    )
    .toBeGreaterThan(0.2);
  await out.screenshot({ path: ".local/aurora-spectral.png" });
  await page.getByLabel("Vibes al ritmo de la música").uncheck();
  await expect(out.getByTestId("music-vibes")).toHaveCount(0);
});
