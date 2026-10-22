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
  for (const name of ["Flujo", "Equipo", "Espacios", "Manual y material"])
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
    page.getByRole("heading", { name: /Un gran equipo/ }),
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
  await expect(page.locator(".personal-next")).toContainText(
    "Cerrar espacio y condiciones",
  );
  await page
    .getByRole("button", { name: "Ver qué tengo que hacer", exact: true })
    .click();
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
      .locator(".orbital-art")
      .evaluate((el) => getComputedStyle(el).animationName),
  ).toBe("none");
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
test("Móvil muestra cuatro fases, horas y descubrimiento sin perder secciones", async ({ page }) => {
  await page.setViewportSize({width:390,height:844});
  await network(page);
  await page.goto('/');
  await expect(page.locator('.phase-pills button')).toHaveCount(4);
  await page.locator('.phase-pills button').nth(1).click();
  await expect(page.locator('.task-card').filter({hasText:'19:30'}).first()).toBeVisible();
  await page.getByRole('navigation',{name:'Secciones móvil'}).getByRole('button',{name:'Descubrir',exact:true}).click();
  await expect(page.locator('.short-card')).toHaveCount(7);
  await expect(page.getByRole('link',{name:'▶ Shorts',exact:true})).toHaveAttribute('href','https://www.youtube.com/@ItsTimeToThink/shorts');
  const phrase=await page.locator('.phrase span').innerText();
  await page.getByRole('button',{name:'Otra frase'}).click();
  await expect(page.locator('.phrase span')).not.toHaveText(phrase);
  await page.getByRole('button',{name:'Más secciones'}).click();
  await page.getByRole('dialog').getByRole('button',{name:'Manual y material',exact:true}).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
