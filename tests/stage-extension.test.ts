import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
test("El proyector se coloca en el monitor secundario sin mover una ventana con otras pestañas", async () => {
  let listener: any, action: any;
  const updates: any[] = [],
    creates: any[] = [],
    messages: any[] = [];
  const context: any = {
    URL,
    Set,
    chrome: {
      runtime: {
        getURL: (p: string) => "chrome-extension://test/" + p,
        onMessage: { addListener: (cb: any) => (listener = cb) },
        sendMessage: async (m: any) => {
          messages.push(m);
          return { ok: true };
        },
      },
      action: {
        onClicked: { addListener: (cb: any) => (action = cb) },
        setBadgeText: async () => {},
        setTitle: async () => {},
        setBadgeBackgroundColor: async () => {},
      },
      offscreen: { hasDocument: async () => true },
      system: {
        display: {
          getInfo: async () => [
            {
              isPrimary: true,
              workArea: { left: 0, top: 0, width: 1920, height: 1080 },
            },
            {
              isPrimary: false,
              workArea: { left: -2560, top: 0, width: 2560, height: 1440 },
            },
          ],
        },
      },
      tabs: {
        query: async () => [{ id: 51 }, { id: 52 }],
        sendMessage: async (id: number, m: any) => messages.push({ id, ...m }),
      },
      windows: {
        create: async (v: any) => {
          creates.push(v);
          return { id: 22 };
        },
        update: async (id: number, v: any) => updates.push({ id, ...v }),
      },
      tabCapture: {
        getCapturedTabs: async () => [],
        getMediaStreamId: async (v: any) => {
          assert.equal(v.targetTabId, 77);
          return "only-user-selected-tab";
        },
      },
      storage: {
        session: { get: async () => ({ itttPlaybackLock: { active: true } }) },
      },
    },
  };
  vm.createContext(context);
  vm.runInContext(
    fs.readFileSync("extension-music/stage-tools.js", "utf8"),
    context,
  );
  const sender = {
    url: "https://spotigetta.github.io/Thinkglaos_app/?projection=1",
    tab: { id: 51, windowId: 21 },
  };
  const result: any = await new Promise((r) =>
    listener({ type: "ITTT_PROJECTOR_PLACE" }, sender, r),
  );
  assert.equal(result.secondary, true);
  assert.deepEqual(
    { ...creates[0] },
    {
      tabId: 51,
      type: "popup",
      left: -2560,
      top: 0,
      width: 2560,
      height: 1440,
    },
  );
  assert.deepEqual(updates.at(-1), {
    id: 22,
    state: "fullscreen",
    focused: true,
  });
  const before = updates.length;
  listener(
    { type: "ITTT_PROJECTOR_PLACE" },
    { ...sender, url: "https://example.org/" },
    () => {},
  );
  listener(
    { type: "ITTT_PROJECTOR_PLACE" },
    {
      ...sender,
      url: "https://spotigetta.github.io/Thinkglaos_app/?control=1",
    },
    () => {},
  );
  assert.equal(
    updates.length,
    before,
    "solo puede mover el proyector autorizado",
  );
  await action({ id: 77, url: "https://music.youtube.com/" });
  assert.ok(
    messages.some(
      (m) =>
        m.type === "STAGE_SPECTRUM_START" &&
        m.streamId === "only-user-selected-tab" &&
        m.blocked === true,
    ),
  );
  const sub = {
    ...sender,
    url: "https://spotigetta.github.io/Thinkglaos_app/?control=1",
  };
  listener({ type: "ITTT_SPECTRUM_SUBSCRIBE" }, sub, () => {});
  listener(
    { type: "STAGE_SPECTRUM_FRAME", bands: { bass: 0.8 } },
    { url: "chrome-extension://test/spectrum.html" },
    () => {},
  );
  await Promise.resolve();
  assert.ok(messages.some((m) => m.id === 51 && m.bands?.bass === 0.8));
});
test("El audio de la extensión vuelve a altavoces una sola vez y el bloqueo de intro controla su salida", async () => {
  let listener: any, interval: any;
  const gainValues: number[] = [],
    connections: any[] = [],
    sent: any[] = [];
  let stopped = 0;
  const stream = {
    getTracks: () => [{ stop: () => stopped++, addEventListener: () => {} }],
  };
  const destination = { name: "speakers" };
  class Context {
    state = "running";
    currentTime = 0;
    sampleRate = 48000;
    destination = destination;
    createMediaStreamSource() {
      return {
        connect: (target: any) => {
          connections.push(target);
          return target;
        },
      };
    }
    createAnalyser() {
      return {
        fftSize: 2048,
        smoothingTimeConstant: 0,
        getFloatFrequencyData: (b: Float32Array) => b.fill(-Infinity),
      };
    }
    createGain() {
      return {
        gain: { value: 0, setTargetAtTime: (v: number) => gainValues.push(v) },
        connect: (target: any) => connections.push(target),
      };
    }
    async resume() {}
    async close() {
      this.state = "closed";
    }
  }
  const context: any = {
    AudioContext: Context,
    Float32Array,
    Math,
    Number,
    navigator: {
      mediaDevices: {
        getUserMedia: async (options: any) => {
          assert.equal(options.video, false);
          assert.equal(options.audio.mandatory.chromeMediaSource, "tab");
          return stream;
        },
      },
    },
    setInterval: (cb: any) => (interval = cb),
    clearInterval: () => {},
    chrome: {
      runtime: {
        id: "test",
        onMessage: { addListener: (cb: any) => (listener = cb) },
        sendMessage: async (m: any) => sent.push(m),
      },
    },
  };
  vm.createContext(context);
  vm.runInContext(
    fs.readFileSync("extension-music/spectrum.js", "utf8"),
    context,
  );
  const result: any = await new Promise((r) =>
    listener(
      {
        target: "spectrum",
        type: "STAGE_SPECTRUM_START",
        streamId: "abc",
        blocked: true,
      },
      { id: "test" },
      r,
    ),
  );
  assert.equal(result.ok, true);
  assert.equal(connections.filter((c) => c === destination).length, 1);
  listener(
    { target: "spectrum", type: "STAGE_AUDIO_GATE", blocked: true },
    { id: "test" },
    () => {},
  );
  listener(
    { target: "spectrum", type: "STAGE_AUDIO_GATE", blocked: false },
    { id: "test" },
    () => {},
  );
  assert.deepEqual(gainValues, [0, 1]);
  interval();
  await Promise.resolve();
  assert.equal(sent[0].type, "STAGE_SPECTRUM_FRAME");
  listener(
    { target: "spectrum", type: "STAGE_SPECTRUM_STOP" },
    { id: "test" },
    () => {},
  );
  assert.equal(stopped, 1);
});
