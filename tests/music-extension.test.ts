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
  await dispatch({ level: 0, revision: 10000 });
  now += 2000;
  [...timers.values()].forEach((cb) => cb());
  assert.equal(media.volume, 0);
  media.volume = 0.7; // El reproductor web intenta restaurarse por su cuenta.
  await dispatch({ level: 0, revision: 10001 });
  now += 2000;
  [...timers.values()].forEach((cb) => cb());
  assert.equal(media.volume, 0, "el objetivo de silencio se vuelve a imponer");
  await dispatch({ level: 1, revision: 9999 });
  now += 2000;
  [...timers.values()].forEach((cb) => cb());
  assert.equal(
    media.volume,
    0,
    "una restauración antigua no puede anular el silencio",
  );
  const before = calls;
  listener(
    { level: 0 },
    { tab: { id: 99 }, url: "https://example.com" },
    () => {},
  );
  await Promise.resolve();
  assert.equal(calls, before);
});
test("Native playback lock survives ads, rejects stale release and restores previous mute", async () => {
  let stored: any = {},
    updated: any,
    removed: any;
  const changes: any[] = [],
    injections: any[] = [];
  const context: any = {
    chrome: {
      storage: {
        session: {
          get: async () => structuredClone(stored),
          set: async (v: any) => {
            stored = structuredClone(v);
          },
        },
      },
      tabs: {
        update: async (id: number, options: any) =>
          changes.push({ id, ...options }),
        onUpdated: { addListener: (cb: any) => (updated = cb) },
        onRemoved: { addListener: (cb: any) => (removed = cb) },
      },
      scripting: {
        executeScript: async (options: any) => {
          injections.push(options.args);
          return [{ result: { wasPlaying: true } }];
        },
      },
    },
    Date,
    Promise,
  };
  vm.createContext(context);
  vm.runInContext(
    fs.readFileSync("extension-music/playback-lock.js", "utf8"),
    context,
  );
  await context.setPlaybackLock(
    [
      { id: 11, mutedInfo: { muted: false } },
      { id: 12, mutedInfo: { muted: true } },
    ],
    true,
    100,
    99,
  );
  assert.equal(stored.itttPlaybackLock.active, true);
  assert.equal(changes[0].muted, true);
  updated(
    11,
    { mutedInfo: { muted: false } },
    { id: 11, url: "https://music.youtube.com/", mutedInfo: { muted: false } },
  );
  await context.__itttMusicOperations;
  assert.equal(
    changes.at(-1).muted,
    true,
    "ad or accidental unmute is blocked",
  );
  assert.equal(await context.setPlaybackLock([], false, 99, 99), false);
  assert.equal(stored.itttPlaybackLock.active, true);
  await context.setPlaybackLock([], false, 101, 99);
  assert.deepEqual(changes.slice(-2), [
    { id: 11, muted: false },
    { id: 12, muted: true },
  ]);
  assert.deepEqual(Array.from(injections.at(-1)), [false, true]);
  await context.setPlaybackLock([{ id: 11 }], true, Date.now() + 10000, 99);
  removed(99);
  await context.__itttMusicOperations;
  assert.equal(
    stored.itttPlaybackLock.active,
    false,
    "closing the desk releases even a future revision",
  );
});
