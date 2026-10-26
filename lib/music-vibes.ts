export type VibesStyle =
  | "halo"
  | "contrast"
  | "shapes"
  | "wave"
  | "prism"
  | "tunnel"
  | "rays"
  | "mixed";
export type VibesScope = "llamada" | "previo" | "pizzas" | "counters" | "all";
export type VibesSettings = {
  enabled: boolean;
  threshold: number;
  intensity: number;
  style: VibesStyle;
  scope: VibesScope;
  styles: Exclude<VibesStyle, "mixed">[];
  rotation: "musical" | "song" | "minutes" | "fixed";
  minutes: number;
  text: boolean;
};
export type MusicPulse = {
  id: number;
  power: number;
  style: VibesStyle;
  time: number;
  preview?: boolean;
  intensity?: number;
};
export const defaultVibes: VibesSettings = {
  enabled: false,
  threshold: 0.38,
  intensity: 0.45,
  style: "contrast",
  scope: "llamada",
  styles: ["contrast"],
  rotation: "musical",
  minutes: 2,
  text: true,
};
const clamp = (x: unknown, fallback: number) =>
  typeof x === "number" && Number.isFinite(x)
    ? Math.max(0.02, Math.min(1, x))
    : fallback;
export function readVibes(input: Partial<VibesSettings> = {}): VibesSettings {
  return {
    enabled: input.enabled === true,
    styles: selectedVibes(input),
    rotation: ["musical", "song", "minutes", "fixed"].includes(
      input.rotation || "",
    )
      ? input.rotation!
      : "musical",
    minutes:
      typeof input.minutes === "number" && Number.isFinite(input.minutes)
        ? Math.max(0.25, Math.min(15, input.minutes))
        : 2,
    text: input.text !== false,
    threshold: clamp(input.threshold, 0.38),
    intensity: clamp(input.intensity, 0.45),
    style: [...vibeStyles.map((s) => s.id), "mixed"].includes(input.style || "")
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

export const vibeStyles = [
  { id: "contrast", name: "Inversión total" },
  { id: "halo", name: "Halos" },
  { id: "shapes", name: "Anillos" },
  { id: "wave", name: "Ondas" },
  { id: "prism", name: "Prisma" },
  { id: "tunnel", name: "Túnel" },
  { id: "rays", name: "Rayos" },
] as const;
type Effect = Exclude<VibesStyle, "mixed">;
export function selectedVibes(input: Partial<VibesSettings>): Effect[] {
  const valid = [
    ...new Set(
      (input.styles || []).filter((id) => vibeStyles.some((s) => s.id === id)),
    ),
  ];
  return valid.length
    ? valid
    : input.style === "mixed"
      ? vibeStyles.map((s) => s.id)
      : [
          vibeStyles.some((s) => s.id === input.style)
            ? (input.style as Effect)
            : "contrast",
        ];
}
export function proportionalIntensity(
  base: number,
  energy: number,
  threshold: number,
) {
  const excess = Math.max(
    0,
    Math.min(1, (energy - threshold) / Math.max(0.02, 1 - threshold)),
  );
  return Math.max(0.02, Math.min(1, base + (1 - base) * excess));
}
/** Holds a visual identity for a musical passage; never cycles effects on every beat.
 * Energy changes are an estimate of musical sections, not semantic chorus recognition. */
export class VibesDirector {
  private style: Effect | null = null;
  private changed = -Infinity;
  private song = "";
  private signature = "";
  private fast = 0;
  private slow = 0;
  private lastSample = 0;
  private high = false;
  constructor(private random: () => number = Math.random) {}
  sample(energy: number, now: number) {
    const dt = this.lastSample
      ? Math.min(1000, Math.max(0, now - this.lastSample))
      : 25;
    this.lastSample = now;
    this.fast += (energy - this.fast) * (1 - Math.exp(-dt / 1800));
    this.slow += (energy - this.slow) * (1 - Math.exp(-dt / 25000));
  }
  choose(settings: VibesSettings, song: string, now: number): Effect {
    const options = selectedVibes(settings),
      signature = JSON.stringify([
        options,
        settings.rotation,
        settings.minutes,
      ]);
    const songChanged = !!song && !!this.song && song !== this.song;
    const rising = this.fast > Math.max(settings.threshold, this.slow * 1.18);
    const falling = this.fast < this.slow * 0.78;
    const nextHigh = rising ? true : falling ? false : this.high;
    const section = nextHigh !== this.high;
    const switchNow =
      !this.style ||
      signature !== this.signature ||
      (settings.rotation !== "fixed" && songChanged) ||
      (settings.rotation === "minutes" &&
        now - this.changed >= settings.minutes * 60000) ||
      (settings.rotation === "musical" &&
        now - this.changed >= 20000 &&
        section);
    if (switchNow) {
      const candidates = options.filter((s) => s !== this.style);
      this.style = candidates.length
        ? candidates[
            Math.min(
              candidates.length - 1,
              Math.floor(this.random() * candidates.length),
            )
          ]
        : options[0];
      this.changed = now;
      this.high = nextHigh;
    }
    this.signature = signature;
    if (song) this.song = song;
    return this.style!;
  }
}
