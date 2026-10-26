import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
test("Extensión: objetivos idempotentes, nivel original conservado y origen validado", async () => {
  let listener: any,
    now = 0,
    id = 0,
    calls = 0;
  const timers = new Map<number, () => void>();
  const media = { volume: 0.7, paused: false };
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
    navigator: {
      mediaSession: { metadata: { title: "Prueba", artist: "Artista" } },
    },
    document: { querySelectorAll: () => [media], title: "Music" },
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
          return [{ result: options.func(...options.args) }];
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
  const dispatch = (m: any) => new Promise<any>((r) => listener(m, sender, r));
  await dispatch({ level: 0.12, ms: 500 });
  now += 1000;
  [...timers.values()].forEach((cb) => cb());
  assert.ok(Math.abs(media.volume - 0.084) < 0.0001);
  const count = id;
  await dispatch({ level: 0.12, ms: 500 });
  assert.equal(id, count, "same target must not restart fade");
  const status = await dispatch({ status: true });
  assert.equal(status.title, "Prueba");
  assert.equal(id, count);
  await dispatch({ level: 0, ms: 1400 });
  now += 1500;
  [...timers.values()].forEach((cb) => cb());
  assert.equal(media.volume, 0);
  await dispatch({ level: 1, ms: 1400 });
  now += 1500;
  [...timers.values()].forEach((cb) => cb());
  assert.ok(Math.abs(media.volume - 0.7) < 0.0001);
  const before = calls;
  listener(
    { level: 0 },
    { tab: { id: 99 }, url: "https://example.com" },
    () => {},
  );
  await Promise.resolve();
  assert.equal(calls, before);
});
