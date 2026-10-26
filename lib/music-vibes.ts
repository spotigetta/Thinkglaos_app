export type VibesStyle = "halo" | "contrast" | "shapes" | "wave" | "mixed";
export type VibesScope = "llamada" | "previo" | "pizzas" | "counters" | "all";
export type VibesSettings = {
  enabled: boolean;
  threshold: number;
  intensity: number;
  style: VibesStyle;
  scope: VibesScope;
};
export type MusicPulse = {
  id: number;
  power: number;
  style: VibesStyle;
  time: number;
  preview?: boolean;
};
export const defaultVibes: VibesSettings = {
  enabled: false,
  threshold: 0.38,
  intensity: 0.45,
  style: "contrast",
  scope: "llamada",
};
const clamp = (x: unknown, fallback: number) =>
  typeof x === "number" && Number.isFinite(x)
    ? Math.max(0.02, Math.min(1, x))
    : fallback;
export function readVibes(input: Partial<VibesSettings> = {}): VibesSettings {
  return {
    enabled: input.enabled === true,
    threshold: clamp(input.threshold, 0.38),
    intensity: clamp(input.intensity, 0.45),
    style: ["halo", "contrast", "shapes", "wave", "mixed"].includes(
      input.style || "",
    )
      ? input.style!
      : defaultVibes.style,
    scope: ["llamada", "previo", "pizzas", "counters", "all"].includes(
      input.scope || "",
    )
      ? input.scope!
      : defaultVibes.scope,
  };
}
export function vibesInScene(settings: VibesSettings, phase: string) {
  if (!settings.enabled || ["intro", "pantalla"].includes(phase)) return false;
  return (
    settings.scope === "all" ||
    (settings.scope === "llamada" && ["llamada", "salida"].includes(phase)) ||
    (settings.scope === "previo" &&
      ["montaje", "agradecimiento", "ambiente", "llamada", "salida"].includes(
        phase,
      )) ||
    (settings.scope === "pizzas" && phase === "pizzas") ||
    (settings.scope === "counters" && ["charla", "preguntas"].includes(phase))
  );
}
export class BeatDetector {
  private last = -Infinity;
  private previous = 0;
  private average = 0;
  private armed = true;
  sample(energy: number, threshold: number, now: number) {
    const baseline = this.average;
    this.average = this.average * 0.9 + energy * 0.1;
    if (energy < threshold * 0.8) this.armed = true;
    const onset =
      this.armed ||
      (energy > this.previous + 0.012 && energy > baseline * 1.08);
    const fire = energy >= threshold && onset && now - this.last >= 400;
    this.previous = energy;
    if (fire) {
      this.last = now;
      this.armed = false;
      return true;
    }
    return false;
  }
}
export const BASS_RANGE = { low: 45, high: 150 };
export function bassDecibels(level: number) {
  return Math.round(-60 + level * 60);
}
/** Only spectral power in the kick/bass band. Overall volume and higher frequencies do not contribute. */
export function analyserEnergy(
  analyser: AnalyserNode,
  bins: Float32Array<ArrayBuffer>,
  sampleRate: number,
) {
  analyser.getFloatFrequencyData(bins);
  const low = Math.max(
    1,
    Math.ceil((BASS_RANGE.low * analyser.fftSize) / sampleRate),
  );
  const high = Math.min(
    bins.length - 1,
    Math.floor((BASS_RANGE.high * analyser.fftSize) / sampleRate),
  );
  let power = 0;
  for (let i = low; i <= high; i++)
    if (Number.isFinite(bins[i])) power += 10 ** (bins[i] / 10);
  if (power <= 0 || high < low) return 0;
  const db = 10 * Math.log10(power / (high - low + 1));
  return Math.max(0, Math.min(1, (db + 60) / 60));
}

export function flashDuration(intensity: number) {
  return Math.round(60 + Math.max(0, Math.min(1, intensity)) * 120);
}
