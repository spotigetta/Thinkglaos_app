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
    .getByText("Intro, charla y preguntas · selección directa", { exact: true })
    .click();
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
  await page
    .getByRole("button", { name: "Tiempo y transporte", exact: true })
    .click();
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
  await expect(page.locator(".show-cues button")).toHaveCount(141);
});

test("Tres momentos claros: montaje tranquilo, ambientillo con voces y llamada con más energía", async ({
  page,
}) => {
  await page.goto("/?control=1");
  const popup = page.waitForEvent("popup");
  await page.getByRole("button", { name: "Abrir proyector ↗" }).click();
  const output = await popup;
  await expect(output.locator(".show-output")).toHaveClass(/montaje/);
  await expect(
    page.getByLabel("Locuciones automáticas en esta escena"),
  ).not.toBeChecked();
  await page.getByRole("button", { name: "Ambiente", exact: true }).click();
  await expect(output.locator(".show-output")).toHaveClass(/ambiente/);
  await expect(
    page.getByLabel("Locuciones automáticas en esta escena"),
  ).toBeChecked();
  await page
    .getByRole("button", { name: "Tiempo y transporte", exact: true })
    .click();
  await page.getByRole("button", { name: "Pausar", exact: true }).click();
  await page.getByLabel("Posición de la fase").fill("28");
  const first = await output.locator("h1").textContent();
  await page.getByLabel("Posición de la fase").fill("56");
  await expect(output.locator("h1")).not.toHaveText(first!);
  await expect(output.locator(".scene-atmosphere")).toHaveCount(1);
  await expect(output.getByAltText("IT’S TIME TO THINK")).toBeVisible();
  await page
    .getByRole("button", { name: "Invitar a sentarse", exact: true })
    .click();
  await expect(output.locator(".show-output")).toHaveClass(/llamada/);
  await expect(
    page.getByRole("button", { name: "Acelerar y lanzar intro", exact: true }),
  ).toBeVisible();
});

test("Una frase seleccionada suena completa desde la mesa sin proyector ni música", async ({
  page,
}) => {
  await page.goto("/?control=1");
  await expect(page.locator(".show-cues button")).toHaveCount(141);
  await page.getByLabel("Buscar frase").fill("Esta noche está permitido");
  await page.locator(".show-cues button").click();
  const voice = page.locator("audio");
  await expect(voice).toHaveAttribute(
    "src",
    "./media/voces-master-v1/voz-02-pcm-v2.mp3",
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
    "./media/voces-master-v1/voz-37-pcm-v2.mp3",
  );
  await expect
    .poll(() => voice.evaluate((a: HTMLAudioElement) => a.currentTime))
    .toBeGreaterThan(0.1);
});

test("Los titulares permanecen visibles durante toda la escena y la cinta no tiene estrellas", async ({
  page,
}) => {
  await page.goto("/?projection=1");
  await page.locator(".kinetic-word").first().waitFor();
  const samples = await page.evaluate(() => {
    const main = document.querySelector("main.scene-copy")!;
    const words = [...document.querySelectorAll(".kinetic-word")];
    return [0, 1000, 6000, 12000, 23000].map((time) => {
      for (const a of document.getAnimations()) a.currentTime = time;
      return {
        opacity: Number(getComputedStyle(main).opacity),
        words: words.every((w) => {
          const s = getComputedStyle(w);
          return (
            s.opacity === "1" && s.clipPath === "none" && s.filter === "none"
          );
        }),
        color: getComputedStyle(document.querySelector("h1")!).color,
      };
    });
  });
  expect(
    samples.every(
      (s) => s.opacity >= 0.65 && s.words && s.color !== "rgba(0, 0, 0, 0)",
    ),
  ).toBe(true);
  await expect(page.locator(".ticker-track")).not.toContainText("✦");
});

test("El proyector anima incluso con Windows en movimiento reducido y permite apagarlo", async ({
  page,
  context,
}) => {
  await context.addInitScript(() => {});
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/?control=1");
  const wait = page.waitForEvent("popup");
  await page.getByRole("button", { name: "Abrir proyector ↗" }).click();
  const out = await wait;
  await out.emulateMedia({ reducedMotion: "reduce" });
  await expect(out.locator("html")).toHaveAttribute(
    "data-projection-motion",
    "full",
  );
  const track = out.locator(".ticker-track");
  await expect
    .poll(() => track.evaluate((e) => getComputedStyle(e).animationName))
    .toBe("ticker-continuous");
  const before = await track.evaluate((e) => getComputedStyle(e).transform);
  await out.waitForTimeout(650);
  expect(await track.evaluate((e) => getComputedStyle(e).transform)).not.toBe(
    before,
  );
  await expect
    .poll(() =>
      out
        .locator(".kinetic-word")
        .first()
        .evaluate((e) =>
          e.getAnimations().some((a) => a.playState === "running"),
        ),
    )
    .toBe(true);
  await page.getByLabel("Animaciones del proyector").uncheck();
  await expect
    .poll(() => track.evaluate((e) => getComputedStyle(e).animationName))
    .toBe("none");
});

test("Agradecimiento completo da paso al ambientillo y pizzas usa su propio banco", async ({
  page,
}) => {
  await page.goto("/?control=1");
  await expect(page.locator(".show-cues button")).toHaveCount(141);
  await page
    .getByRole("button", { name: "Agradecimiento · discurso", exact: true })
    .click();
  const voice = page.locator("audio");
  await expect(voice).toHaveAttribute(
    "src",
    "./media/voces-master-v1/oct25-g1-s2-16.mp3",
  );
  await expect
    .poll(() => voice.evaluate((a: HTMLAudioElement) => a.currentTime))
    .toBeGreaterThan(0.1);
  await voice.evaluate((e) => e.dispatchEvent(new Event("ended")));
  await expect(page.locator(".show-monitor")).toContainText("Ambientillo");
  await page
    .getByRole("button", { name: "Pizzas · conversación", exact: true })
    .click();
  await expect(page.locator(".show-monitor")).toContainText("Pizzas");
  await page.getByRole("button", { name: "Más frases", exact: true }).click();
  await expect(page.getByLabel("Pausa entre locuciones")).toHaveValue("20");
  await page.getByLabel("Filtrar voces por momento").selectOption("montaje");
  await page.getByLabel("Buscar frase").fill("Ese fuet no se corta solo");
  await page.locator(".show-cues button").click();
  await expect(voice).toHaveAttribute(
    "src",
    "./media/voces-master-v1/oct25-g1-s1-11.mp3",
  );
  await expect
    .poll(() => voice.evaluate((a: HTMLAudioElement) => a.currentTime))
    .toBeGreaterThan(0.1);
});

test("La frecuencia espera al final de la voz y alterna la siguiente sin cortar", async ({
  page,
}) => {
  await page.clock.install();
  await page.goto("/?control=1");
  await expect(page.locator(".show-cues button")).toHaveCount(141);
  await page.getByRole("button", { name: "Montaje", exact: true }).click();
  await page.getByLabel("Pausa entre locuciones").fill("10");
  await page.clock.runFor(11000);
  const voice = page.locator("audio");
  await expect(voice).toHaveAttribute(
    "src",
    "./media/voces-master-v1/oct25-g1-s1-01.mp3",
  );
  await page.getByLabel("Pausa entre locuciones").fill("20");
  await voice.evaluate((a: HTMLAudioElement) => {
    a.pause();
    a.dispatchEvent(new Event("ended"));
  });
  await page.clock.runFor(19000);
  await expect(voice).toHaveAttribute(
    "src",
    "./media/voces-master-v1/oct25-g1-s1-01.mp3",
  );
  await page.clock.runFor(2000);
  await expect(voice).toHaveAttribute(
    "src",
    "./media/voces-master-v1/oct25-g1-s2-01.mp3",
  );
});

test("La voz normalizada produce señal real, admite refuerzo y recuerda el ajuste", async ({
  page,
}) => {
  await page.goto("/?control=1");
  await expect(page.locator(".show-cues button")).toHaveCount(141);
  await page.getByLabel("Buscar frase").fill("Qué bonito es el voluntariado");
  await page.locator(".show-cues button").click();
  await expect(page.locator("audio")).toHaveAttribute(
    "src",
    "./media/voces-master-v1/oct25-g1-s1-01.mp3",
  );
  await expect
    .poll(() =>
      page
        .getByLabel("Nivel real de voz")
        .evaluate((m: HTMLMeterElement) => m.value),
    )
    .toBeGreaterThan(0.05);
  await page.getByLabel("Refuerzo de voz").fill("3");
  await expect(page.getByLabel("Refuerzo de voz")).toHaveValue("3");
  await page.reload();
  await expect(page.getByLabel("Refuerzo de voz")).toHaveValue("3");
});

test("Montaje y pizzas mantienen la música baja al ajustar una voz en directo", async ({
  page,
}) => {
  await page.goto("/?projection=1");
  for (const phase of ["montaje", "pizzas", "agradecimiento"]) {
    await page.evaluate((phase) => {
      const channel = new BroadcastChannel("ittt-show-v1");
      (window as any).audioTestChannel = channel;
      channel.postMessage({
        type: "state",
        state: {
          phase,
          running: true,
          started: Date.now(),
          offset: 0,
          volume: 0.6,
          duckLevel: 0.1,
          voiceVolume: 1,
          internalMusic: true,
          minutes: 30,
          motion: true,
        },
      });
    }, phase);
    await expect(page.locator(".show-output")).toHaveClass(new RegExp(phase));
    await page.evaluate(() =>
      (window as any).audioTestChannel.postMessage({ type: "duck-music" }),
    );
    await expect
      .poll(() =>
        page.locator("audio").evaluate((a: HTMLAudioElement) => a.volume),
      )
      .toBeLessThan(0.08);
    await page.evaluate(
      (phase) =>
        (window as any).audioTestChannel.postMessage({
          type: "state",
          state: {
            phase,
            running: true,
            started: Date.now(),
            offset: 0,
            volume: 0.6,
            duckLevel: 0.1,
            voiceVolume: 0.8,
            internalMusic: true,
            minutes: 30,
            motion: true,
          },
        }),
      phase,
    );
    await page.waitForTimeout(1300);
    expect(
      await page.locator("audio").evaluate((a: HTMLAudioElement) => a.volume),
    ).toBeLessThan(0.08);
    await page.evaluate(() => (window as any).audioTestChannel.close());
  }
});
