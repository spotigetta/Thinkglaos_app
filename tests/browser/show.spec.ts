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
