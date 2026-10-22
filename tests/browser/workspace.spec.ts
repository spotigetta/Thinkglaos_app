import { test, expect, type Page } from "@playwright/test";
import fs from "node:fs";
let remote = JSON.parse(fs.readFileSync("public/data/seed.json", "utf8"));
let writes = 0;
async function network(page: Page, edit = true) {
  await page.route("https://raw.githubusercontent.com/**", (route) =>
    route.fulfill({ json: remote }),
  );
  await page.route("https://api.github.com/**", async (route) => {
    const url = route.request().url();
    if (url.includes("/user"))
      return route.fulfill({ json: { login: "test-ambassador" } });
    if (url.includes("/contents/")) {
      if (route.request().method() === "PUT") {
        writes++;
        remote = JSON.parse(
          Buffer.from(
            route.request().postDataJSON().content,
            "base64",
          ).toString(),
        );
        return route.fulfill({ json: { content: { sha: "new" } } });
      }
      return route.fulfill({
        json: {
          sha: "test-" + writes,
          content: Buffer.from(JSON.stringify(remote)).toString("base64"),
        },
      });
    }
    return route.fulfill({
      json: url.includes("/issues") ? [] : { permissions: { push: edit } },
    });
  });
}
test.beforeEach(() => {
  remote = JSON.parse(fs.readFileSync("public/data/seed.json", "utf8"));
  writes = 0;
});
test("Voluntario consulta todas las secciones, instrucciones y fuentes sin escribir", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await network(page);
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "Nueva tarea", exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole("button", {
      name: "Ver detalle de Cerrar espacio y condiciones",
      exact: true,
    })
    .click();
  await expect(page.getByRole("dialog")).toContainText("Confirmar aforo");
  await expect(
    page.getByRole("dialog").getByRole("checkbox").first(),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Cerrar", exact: true }).click();
  for (const name of [
    "Línea temporal",
    "Equipo",
    "Espacios",
    "Manual y material",
  ])
    await page
      .getByRole("navigation", { name: "Secciones", exact: true })
      .getByRole("button", { name, exact: true })
      .click();
  await page
    .getByRole("button", { name: /Manual completo de organización/ })
    .click();
  await expect(page.getByRole("dialog")).toContainText("PREVIO A TODO");
  await page.getByRole("button", { name: "Cerrar", exact: true }).click();
  await page
    .getByRole("navigation", { name: "Secciones", exact: true })
    .getByRole("button", { name: "Preguntas", exact: true })
    .click();
  await page
    .getByRole("button", { name: "¿Cómo preparamos las entradas QR?" })
    .click();
  await expect(page.getByText("Fuentes consultadas").first()).toBeVisible();
  expect(writes).toBe(0);
  expect(errors).toEqual([]);
  await page.screenshot({
    path: ".local/questions-desktop.png",
    fullPage: true,
  });
});
test("Embajador crea, edita y borra; el móvil consulta los cambios de la rama data", async ({
  page,
  browser,
}) => {
  await network(page);
  await page.goto("/");
  await page.getByRole("button", { name: /Acceso de embajadores/ }).click();
  await page.getByLabel("Token personal de GitHub").fill("test-token-not-real");
  await page
    .getByRole("button", { name: "Conectar cuenta", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Nueva tarea", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Nueva tarea", exact: true }).click();
  await page
    .getByLabel("Qué hay que hacer")
    .fill("Prueba de sincronización móvil");
  await page
    .getByLabel("Instrucciones · una por línea")
    .fill("Comprobar ambas pantallas");
  await page
    .getByRole("button", { name: "Guardar tarea", exact: true })
    .click();
  await expect
    .poll(() =>
      remote.tasks.some(
        (t: { title: string }) => t.title === "Prueba de sincronización móvil",
      ),
    )
    .toBe(true);
  const mobile = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  const phone = await mobile.newPage();
  await network(phone);
  await phone.goto("/");
  await expect(
    phone.getByRole("heading", {
      name: "Prueba de sincronización móvil",
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByRole("button", {
      name: "Ver detalle de Prueba de sincronización móvil",
      exact: true,
    })
    .click();
  await page.getByRole("button", { name: "Editar", exact: true }).click();
  await page.getByLabel("Qué hay que hacer").fill("Prueba editada");
  await page
    .getByRole("button", { name: "Guardar tarea", exact: true })
    .click();
  await expect
    .poll(() =>
      remote.tasks.some((t: { title: string }) => t.title === "Prueba editada"),
    )
    .toBe(true);
  await page
    .getByRole("button", { name: "Ver detalle de Prueba editada", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Eliminar tarea", exact: true })
    .click();
  await page.getByRole("button", { name: "Eliminar", exact: true }).click();
  await expect
    .poll(() =>
      remote.tasks.some((t: { title: string }) => t.title === "Prueba editada"),
    )
    .toBe(false);
  expect(writes).toBe(3);
  await mobile.close();
});
test("La cuenta de lectura no se convierte en embajador y el móvil no tiene desbordamientos", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await network(page, false);
  await page.goto("/");
  await page
    .getByRole("button", { name: "Conexión y permisos", exact: true })
    .click();
  await page.getByLabel("Token personal de GitHub").fill("read-only-token");
  await page
    .getByRole("button", { name: "Conectar cuenta", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Nueva tarea", exact: true }),
  ).toHaveCount(0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({ path: ".local/mobile-plan.png", fullPage: true });
  await page
    .getByRole("navigation", { name: "Secciones móvil" })
    .getByRole("button", { name: "Equipo", exact: true })
    .click();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(writes).toBe(0);
});
test("Escritorio muestra el plan de forma estable", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await network(page);
  await page.goto("/");
  await expect(
    page
      .locator(".start-here")
      .getByRole("heading", { name: "Laura Rodríguez Rivero" }),
  ).toBeVisible();
  await page.screenshot({ path: ".local/desktop-plan.png", fullPage: true });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
test("Los textos de WhatsApp están reservados a embajadores y se pueden copiar y personalizar", async ({
  page,
}) => {
  await network(page);
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", {
      value: {
        writeText: async (text: string) => {
          (window as any).__copied = text;
        },
      },
    });
  });
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "Textos WhatsApp", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: /Acceso de embajadores/ }).click();
  await page.getByLabel("Token personal de GitHub").fill("test-token");
  await page
    .getByRole("button", { name: "Conectar cuenta", exact: true })
    .click();
  await page
    .getByRole("navigation", { name: "Secciones", exact: true })
    .getByRole("button", { name: "Textos WhatsApp", exact: true })
    .click();
  await expect(page.getByLabel("Texto de WhatsApp")).toHaveValue(
    /Laura Rodríguez Rivero/,
  );
  await page
    .getByRole("button", { name: "Copiar para WhatsApp", exact: true })
    .click();
  expect(await page.evaluate(() => (window as any).__copied)).toContain(
    "Claustro Santo Tomé",
  );
  await page.getByRole("button", { name: "Personalizar", exact: true }).click();
  await page
    .getByLabel("Texto de WhatsApp")
    .fill("Mensaje personalizado para nuestro equipo");
  await page
    .getByRole("button", { name: "Guardar texto", exact: true })
    .click();
  await expect
    .poll(() =>
      remote.resources.some(
        (r: { kind: string; notes: string }) =>
          r.kind === "Texto embajadores" &&
          r.notes === "Mensaje personalizado para nuestro equipo",
      ),
    )
    .toBe(true);
  await page.screenshot({
    path: ".local/messages-desktop.png",
    fullPage: true,
  });
});

test("Asignación rápida, incorporación en lote y vista personal conservan el mismo tablero", async ({
  page,
}) => {
  await network(page);
  await page.goto("/");
  await page.getByRole("button", { name: /Acceso de embajadores/ }).click();
  await page.getByLabel("Token personal de GitHub").fill("test-token");
  await page
    .getByRole("button", { name: "Conectar cuenta", exact: true })
    .click();
  await page
    .getByRole("button", {
      name: "Asignar responsable: Cerrar espacio y condiciones",
      exact: true,
    })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: /Pablo Ramírez/ })
    .click();
  await expect
    .poll(
      () =>
        remote.tasks.find((t: { id: string }) => t.id === "planning-0")
          ?.assignedTo,
    )
    .toBe("Pablo Ramírez");
  await page.getByLabel("Mi nombre en el equipo").selectOption("Pablo Ramírez");
  await expect(page.locator(".my-next")).toContainText(
    "Cerrar espacio y condiciones",
  );
  await page.locator(".my-next").getByRole("button").click();
  await expect(page.getByRole("dialog")).toContainText("Pablo Ramírez");
  await page.getByRole("button", { name: "Cerrar", exact: true }).click();
  await page
    .getByRole("button", { name: "Sumar al equipo", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Varias de una vez", exact: true })
    .click();
  await page
    .getByLabel("Nombres · uno por línea")
    .fill("Ana García\nLuis Pérez\nana garcia\nPablo Ramírez");
  await expect(
    page.getByRole("button", { name: "Incorporar 2 personas", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Incorporar 2 personas", exact: true })
    .click();
  await expect
    .poll(
      () =>
        remote.members.filter((m: { name: string }) =>
          ["Ana García", "Luis Pérez"].includes(m.name),
        ).length,
    )
    .toBe(2);
  expect(
    remote.members.filter((m: { name: string }) => m.name === "Pablo Ramírez")
      .length,
  ).toBe(1);
  await page
    .getByRole("button", {
      name: "Asignar responsable: Recepción de paquetes",
      exact: true,
    })
    .click();
  await page.getByLabel("Buscar persona para asignar").fill("Ana");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: /Ana García/ })
    .click();
  await expect
    .poll(
      () =>
        remote.tasks.find((t: { id: string }) => t.id === "manual-002")
          ?.assignedTo,
    )
    .toBe("Ana García");
  await page
    .getByRole("button", {
      name: "Asignar responsable: Setup Lector QR",
      exact: true,
    })
    .click();
  await page.screenshot({
    path: ".local/quick-assignment.png",
    fullPage: false,
  });
  await page
    .getByRole("button", { name: "Añadir persona y asignar", exact: true })
    .click();
  await page.getByLabel("Nombre visible").fill("Eva Pérez");
  await page
    .getByRole("button", { name: "Añadir al equipo", exact: true })
    .click();
  await expect
    .poll(
      () =>
        remote.members.some((m: { name: string }) => m.name === "Eva Pérez") &&
        remote.tasks.find(
          (t: { title: string }) => t.title === "Setup Lector QR",
        )?.assignedTo === "Eva Pérez",
    )
    .toBe(true);
});
test("Reducir movimiento mantiene la navegación y las acciones, sin animaciones", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await network(page);
  await page.goto("/");
  await expect(page.locator(".phase-pills")).toBeVisible();
  expect(
    await page
      .locator(".start-actions>button")
      .first()
      .evaluate((el) => getComputedStyle(el).transitionDuration),
  ).toBe("0s");
  await page
    .getByRole("navigation", { name: "Secciones", exact: true })
    .getByRole("button", { name: "Equipo", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Pablo Ramírez", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
test("Móvil muestra cuatro fases, horas y descubrimiento sin perder secciones", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await network(page);
  await page.goto("/");
  await expect(page.locator(".phase-pills button")).toHaveCount(4);
  await page.locator(".phase-pills button").nth(1).click();
  await expect(
    page.locator(".task-card").filter({ hasText: "19:30" }).first(),
  ).toBeVisible();
  await page
    .getByRole("navigation", { name: "Secciones móvil" })
    .getByRole("button", { name: "Vídeos", exact: true })
    .click();
  await expect(page.locator(".short-card")).toHaveCount(7);
  await page.locator(".event-discovery>summary").click();
  await expect(
    page.getByRole("link", { name: "▶ Shorts", exact: true }),
  ).toHaveAttribute("href", "https://www.youtube.com/@ItsTimeToThink/shorts");
  const phrase = await page.locator(".phrase span").innerText();
  await page.getByRole("button", { name: "Otra frase" }).click();
  await expect(page.locator(".phrase span")).not.toHaveText(phrase);
  await page.getByRole("button", { name: "Más secciones" }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Manual y material", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("Espacios muestra dirección, Maps y fotos en móvil", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await network(page);
  await page.route("https://www.google.com/maps**", (route) =>
    route.fulfill({ body: "", contentType: "text/html" }),
  );
  await page.goto("/");
  await page.getByRole("button", { name: "Más secciones" }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Espacios", exact: true })
    .click();
  const claustro = page.locator(".venue-card").filter({
    has: page.getByRole("heading", { name: "Claustro Santo Tomé" }),
  });
  await expect(claustro).toContainText("Plaza del Conde, 4");
  await expect(
    claustro.getByRole("link", { name: /Cómo llegar/ }),
  ).toHaveAttribute("href", /google\.com\/maps/);
  await expect(claustro.getByRole("link", { name: /Fotos/ })).toHaveAttribute(
    "href",
    /tbm=isch/,
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("Inicio orienta al voluntario, filtra sus tareas y comparte el MP3", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await network(page);
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", {
      value: {
        writeText: async (text: string) => {
          (window as any).__copied = text;
        },
      },
    });
    Object.defineProperty(navigator, "canShare", { value: () => true });
    Object.defineProperty(navigator, "share", {
      value: async (data: ShareData) => {
        const file = data.files![0];
        (window as any).__shared = {
          name: file.name,
          size: file.size,
          type: file.type,
        };
      },
    });
  });
  await page.goto("/");
  await page
    .getByRole("button", { name: "Guía rápida Qué hacemos", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toContainText("17:30");
  await page
    .getByRole("button", { name: "Copiar para WhatsApp", exact: true })
    .click();
  expect(await page.evaluate(() => (window as any).__copied)).toContain(
    "Pablo Ramírez",
  );
  expect(await page.evaluate(() => (window as any).__copied)).not.toContain(
    "Javier Yuste, embajador",
  );
  await page.getByRole("button", { name: "Cerrar", exact: true }).click();
  await page.getByLabel("Mi nombre en el equipo").selectOption("Javier Yuste");
  await page.getByRole("button", { name: /Mis tareas .*pendientes/ }).click();
  await expect(
    page.getByRole("heading", { name: "Mis tareas", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Ver todo el equipo", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Vídeos Ver y compartir", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Compartir audio", exact: true })
    .click();
  await expect
    .poll(() => page.evaluate(() => (window as any).__shared?.size))
    .toBeGreaterThan(100000);
  expect(await page.evaluate(() => (window as any).__shared.type)).toBe(
    "audio/mpeg",
  );
  expect(await page.evaluate(() => (window as any).__shared.name)).toBe(
    "Manolo-Lama-Thinkglaos.mp3",
  );
  await page.route("https://www.youtube-nocookie.com/**", (r) =>
    r.fulfill({
      body: "<html><body>Player</body></html>",
      contentType: "text/html",
    }),
  );
  await page.locator(".youtube-card").first().getByRole("button").click();
  await expect(page.locator(".youtube-frame iframe")).toHaveCount(1);
  await page.locator(".youtube-card").nth(1).getByRole("button").click();
  await expect(page.locator(".youtube-frame iframe")).toHaveCount(1);
  await page
    .getByRole("tab", { name: "Charlas completas", exact: true })
    .click();
  await expect(page.locator(".youtube-frame iframe")).toHaveCount(0);
  await expect(
    page.locator(".youtube-card").first().getByRole("button"),
  ).toBeVisible();
  await page
    .getByRole("tab", { name: "Material del equipo", exact: true })
    .click();
  await expect(page.locator(".team-media video").first()).toBeVisible();
  expect(writes).toBe(0);
});

test("El voluntario lee el PDF completo y retoma la última página", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await network(page);
  await page.goto("/");
  await page
    .getByRole("button", { name: "Libro del voluntario", exact: true })
    .click();
  await expect(page.locator(".book-canvas")).toHaveAttribute(
    "aria-busy",
    "false",
  );
  await expect(
    page.getByLabel("Página del libro").locator("option"),
  ).toHaveCount(81);
  await page
    .getByRole("button", { name: "Roles de la noche", exact: true })
    .click();
  await expect(page.locator(".book-canvas")).toHaveAttribute(
    "aria-busy",
    "false",
  );
  await expect(page.getByLabel("Página del libro")).toHaveValue("77");
  await expect(page.locator(".book-reader>details")).toContainText(
    "Roles del equipo",
  );
  await page.getByRole("button", { name: "Ampliar zoom del libro" }).click();
  await expect(page.locator(".book-canvas")).toHaveAttribute(
    "aria-busy",
    "false",
  );
  await page
    .getByRole("navigation", { name: "Secciones móvil" })
    .getByRole("button", { name: "Plan", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Libro del voluntario", exact: true })
    .click();
  await expect(page.getByLabel("Página del libro")).toHaveValue("77");
  expect(writes).toBe(0);
});

test("La línea temporal avanza con la hora real del día del encuentro", async ({
  page,
}) => {
  await page.clock.install({ time: new Date("2026-10-29T16:29:30Z") });
  await network(page);
  await page.goto("/");
  await page
    .getByRole("button", { name: "Línea temporal", exact: true })
    .last()
    .click();
  await expect(page.getByTestId("madrid-clock")).toHaveText("17:29:30");
  await expect(page.locator(".timeline-now")).toHaveCount(1);
  const before = await page
    .locator(".timeline-now")
    .evaluate((el) => parseFloat((el as HTMLElement).style.top));
  await page.clock.fastForward(70000);
  await expect(page.getByTestId("madrid-clock")).toHaveText("17:30:40");
  await expect
    .poll(() =>
      page
        .locator(".timeline-now")
        .evaluate((el) => parseFloat((el as HTMLElement).style.top)),
    )
    .toBeGreaterThan(before);
  await page.getByRole("button", { name: "Ir a ahora", exact: true }).click();
  await page
    .locator(".timeline-task")
    .filter({ hasText: "Recibir Mercadona" })
    .click();
  await expect(page.getByRole("dialog")).toContainText(
    "Guardar inmediatamente",
  );
  expect(writes).toBe(0);
});

test("Modo montaje pausa, cambia escenas, carga música y permite salir", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.clock.install();
  await network(page);
  await page.goto("/");
  await page.route("https://www.itstimetothink.org/**", (r) =>
    r.fulfill({
      body: "<html><body>ITTT</body></html>",
      contentType: "text/html",
    }),
  );
  await page.getByRole("button", { name: "Modo montaje", exact: true }).click();
  await expect(
    page.getByRole("dialog", { name: "Modo montaje Thinkglao", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".montage-photo-panel img")).toHaveAttribute(
    "src",
    "./montage/photo-1.jpg",
  );
  await page
    .getByRole("button", { name: "Pausar escenas", exact: true })
    .click();
  await page.clock.fastForward(25000);
  await expect(page.locator(".montage-photo-panel img")).toHaveAttribute(
    "src",
    "./montage/photo-1.jpg",
  );
  await page
    .getByRole("button", { name: "Reanudar escenas", exact: true })
    .click();
  await page.clock.fastForward(22000);
  await expect(page.locator(".montage-photo-panel img")).toHaveAttribute(
    "src",
    "./montage/photo-2.jpg",
  );
  await page.getByLabel("Elegir música para el montaje").setInputFiles({
    name: "musica.mp3",
    mimeType: "audio/mpeg",
    buffer: fs.readFileSync("public/media/audio-manolo-whatsapp.mp3"),
  });
  await expect(page.locator(".montage-music audio")).toBeVisible();
  await page
    .getByRole("button", { name: "Pantalla completa", exact: true })
    .click();
  await expect
    .poll(() =>
      page.evaluate(() =>
        document.fullscreenElement?.classList.contains("montage-screen"),
      ),
    )
    .toBe(true);
  await page
    .getByRole("button", { name: "Web en directo", exact: true })
    .click();
  await expect(page.locator(".montage-live iframe")).toHaveAttribute(
    "src",
    "https://www.itstimetothink.org/thinkglaos",
  );
  await page
    .getByRole("button", { name: "Salir del modo montaje", exact: true })
    .click();
  await expect(page.locator(".montage-screen")).toHaveCount(0);
  await expect(page.locator(".start-here")).toBeVisible();
  expect(writes).toBe(0);
});
