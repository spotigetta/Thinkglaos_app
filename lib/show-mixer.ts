/** One policy for music: speech never restores over a transition or intro. */
export function mixPolicy(
  s: {
    phase: string;
    running: boolean;
    internalMusic: boolean;
    volume: number;
    duckLevel: number;
  },
  foreground: boolean,
) {
  const bed = [
    "montaje",
    "ambiente",
    "llamada",
    "pizzas",
    "agradecimiento",
  ].includes(s.phase);
  const takeover = [
    "llamada",
    "salida",
    "intro",
    "charla",
    "preguntas",
    "pantalla",
  ].includes(s.phase);
  const factor = foreground ? s.duckLevel : 1;
  return {
    local: s.running && s.internalMusic && bed ? s.volume * factor : 0,
    external:
      (takeover && s.internalMusic) ||
      ["salida", "intro", "charla", "preguntas"].includes(s.phase)
        ? 0
        : foreground
          ? factor
          : 1,
    ms: s.phase === "salida" ? 7500 : foreground ? 450 : 1400,
  };
}
/** Wall-clock ramp: background tabs do not depend on requestAnimationFrame. */
export class VolumeFader {
  private timer: ReturnType<typeof setInterval> | undefined;
  private target = -1;
  set(media: HTMLMediaElement, target: number, ms: number) {
    target = Math.max(0, Math.min(1, target));
    if (target === this.target) return;
    this.target = target;
    clearInterval(this.timer);
    const from = media.volume,
      start = Date.now();
    const step = () => {
      const p = Math.min(1, (Date.now() - start) / ms);
      media.volume = from + (target - from) * p * p * (3 - 2 * p);
      if (p === 1) clearInterval(this.timer);
    };
    step();
    this.timer = setInterval(step, 40);
  }
  close() {
    clearInterval(this.timer);
    this.target = -1;
  }
}
