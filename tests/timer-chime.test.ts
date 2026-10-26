import { test } from "node:test";
import assert from "node:assert/strict";
import { playTimerChime, TIMER_MUSIC_SECONDS } from "../lib/timer-chime";
test("La música se programa durante treinta segundos y se cancela con un fundido corto", async () => {
  const stopped: number[][] = [];
  const param = () => ({
    value: 0,
    setValueAtTime() {},
    exponentialRampToValueAtTime() {},
    cancelScheduledValues() {},
    setTargetAtTime() {},
  });
  const node = () => ({
    connect(next: any) {
      return next;
    },
    disconnect() {},
    gain: param(),
    threshold: param(),
    knee: param(),
    ratio: param(),
    attack: param(),
    release: param(),
  });
  const context = {
    currentTime: 10,
    destination: node(),
    resume: () => Promise.resolve(),
    createGain: node,
    createDynamicsCompressor: node,
    createOscillator: () => {
      const stop: number[] = [];
      stopped.push(stop);
      return {
        ...node(),
        frequency: param(),
        type: "sine",
        start() {},
        stop(at: number) {
          stop.push(at);
        },
      };
    },
  };
  let finished = 0;
  const playback = playTimerChime(
    context as unknown as AudioContext,
    () => finished++,
  );
  await Promise.resolve();
  assert.equal(TIMER_MUSIC_SECONDS, 30);
  assert.ok(stopped.length > 20);
  const end = Math.max(...stopped.flat());
  assert.ok(
    end >= 39.9 && end <= 40.1,
    "el último sonido debe terminar a los 30 segundos",
  );
  playback.stop();
  assert.equal(finished, 1);
  assert.ok(
    stopped.every((t) => t.at(-1)! <= 10.081),
    "todos los sonidos programados se cancelan inmediatamente",
  );
  playback.stop();
  assert.equal(finished, 1);
});
