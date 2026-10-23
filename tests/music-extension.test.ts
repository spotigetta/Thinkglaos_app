import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
test("La extensión baja y restaura el volumen original sin aceptar órdenes de otras webs", async () => {
  let listener: any,
    now = 0,
    id = 0,
    calls = 0;
  const timers = new Map<number, () => void>(),
    media = { volume: 0.7 };
  class Clock extends Date {
    static now() {
      return now;
    }
  }
  const context = {
    window: {},
    Date: Clock,
    URL,
    Map,
    Math,
    Promise,
    document: { querySelectorAll: () => [media] },
    setInterval: (cb: () => void) => {
      timers.set(++id, cb);
      return id;
    },
    clearInterval: (key: number) => timers.delete(key),
    chrome: {
      runtime: { onMessage: { addListener: (cb: any) => (listener = cb) } },
      tabs: { query: async () => [{ id: 11 }] },
      scripting: {
        executeScript: async (options: any) => {
          calls++;
          options.func(...options.args);
        },
      },
    },
  };
  vm.runInNewContext(
    fs.readFileSync("extension-music/background.js", "utf8"),
    context,
  );
  const sender = {
    tab: { id: 99 },
    url: "https://spotigetta.github.io/Thinkglaos_app/?control=1",
  };
  await listener({ duck: true }, sender);
  now += 1000;
  [...timers.values()].forEach((cb) => cb());
  assert.ok(Math.abs(media.volume - 0.161) < 0.0001);
  await listener({ duck: false }, sender);
  now += 1000;
  [...timers.values()].forEach((cb) => cb());
  assert.ok(Math.abs(media.volume - 0.7) < 0.0001);
  const before = calls;
  await listener(
    { duck: true },
    { tab: { id: 99 }, url: "https://example.com" },
  );
  assert.equal(calls, before);
});
