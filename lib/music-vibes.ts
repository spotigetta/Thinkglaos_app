export type VibesStyle =
  | "aurora"
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
  bands?: MusicBands;
  ambient?: boolean;
  accent?: "bass" | "upbeat" | "treble";
  baseStyle?: VibesStyle;
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
  { id: "aurora", name: "Aurora espectral" },
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
export type MusicalSection =
  "silence" | "calm" | "build" | "drive" | "peak" | "break";
export const musicalSectionLabels: Record<MusicalSection, string> = {
  silence: "Sin señal",
  calm: "Ambiente",
  build: "Subida",
  drive: "Ritmo sostenido",
  peak: "Pico de energía",
  break: "Respiro",
};
export type DirectorStatus = {
  section: MusicalSection;
  style: Effect | null;
  bpm: number | null;
  confidence: number;
  reason: string;
};
/** Online musical heuristics, not semantic chorus recognition. Decisions depend on
 * sustained multi-band changes and confident rhythmic boundaries, not per-beat randomness. */
export class VibesDirector {
  private style: Effect | null = null;
  private visualSection: MusicalSection = "calm";
  private changed = -Infinity;
  private song = "";
  private signature = "";
  private fast: MusicBands = { bass: 0, mid: 0, high: 0, air: 0 };
  private medium: MusicBands = { bass: 0, mid: 0, high: 0, air: 0 };
  private slow: MusicBands = { bass: 0, mid: 0, high: 0, air: 0 };
  private lastSample: number | null = null;
  private input: MusicBands = { bass: 0, mid: 0, high: 0, air: 0 };
  private firstSample = 0;
  private signalSince: number | null = null;
  private signalPrimed = false;
  private section: MusicalSection = "calm";
  private candidate: MusicalSection = "calm";
  private candidateSince = 0;
  private sectionSince = 0;
  private beatCount = 0;
  private lastBeat = -Infinity;
  private intervals: number[] = [];
  private bpm: number | null = null;
  private confidence = 0;
  private anchor: MusicBands = { bass: 0, mid: 0, high: 0, air: 0 };
  private pendingSince: number | null = null;
  private pendingKey = "";
  private reason = "Esperando señal musical";
  private uses = new Map<Effect, number>();
  private memories: {
    section: MusicalSection;
    shape: number[];
    style: Effect;
  }[] = [];
  constructor(private random: () => number = Math.random) {}
  private energy(b: MusicBands) {
    return b.bass * 0.4 + b.mid * 0.32 + b.high * 0.2 + b.air * 0.08;
  }
  private shape() {
    const b = this.medium;
    const sum = Math.max(0.04, b.bass + b.mid + b.high + b.air);
    return [b.bass / sum, b.mid / sum, (b.high + b.air) / sum];
  }
  sample(input: MusicBands | number, now: number, beat = false) {
    const bands =
      typeof input === "number"
        ? { bass: input, mid: input * 0.7, high: input * 0.4, air: input * 0.2 }
        : input;
    const dt =
      this.lastSample === null
        ? 25
        : Math.max(0, Math.min(1000, now - this.lastSample));
    if (this.lastSample === null) this.firstSample = now;
    this.lastSample = now;
    for (const key of ["bass", "mid", "high", "air"] as const) {
      const value = Math.max(
        0,
        Math.min(1, Number.isFinite(bands[key]) ? bands[key] : 0),
      );
      this.input[key] = value;
      this.fast[key] += (value - this.fast[key]) * (1 - Math.exp(-dt / 450));
      this.medium[key] +=
        (value - this.medium[key]) * (1 - Math.exp(-dt / 2400));
      this.slow[key] += (value - this.slow[key]) * (1 - Math.exp(-dt / 22000));
    }
    if (
      this.signalSince === null &&
      Math.max(...Object.values(this.input)) > 0.04
    )
      this.signalSince = now;
    if (beat) {
      const gap = now - this.lastBeat;
      if (gap >= 350 && gap <= 1400) {
        this.intervals.push(gap);
        if (this.intervals.length > 12) this.intervals.shift();
      } else if (gap > 2400) {
        this.intervals = [];
        this.beatCount = 0;
      }
      this.lastBeat = now;
      this.beatCount++;
      if (this.intervals.length >= 4) {
        const sorted = [...this.intervals].sort((a, b) => a - b),
          median = sorted[Math.floor(sorted.length / 2)];
        const matching = this.intervals.filter(
          (v) => Math.abs(v - median) < median * 0.13,
        );
        this.confidence =
          (matching.length / this.intervals.length) *
          Math.min(1, this.intervals.length / 8);
        this.bpm = this.confidence >= 0.55 ? Math.round(60000 / median) : null;
      }
    }
    if (now - this.lastBeat > 3000) {
      this.confidence = 0;
      this.bpm = null;
    }
    const fast = this.energy(this.fast),
      mid = this.energy(this.medium),
      slow = this.energy(this.slow);
    let next: MusicalSection;
    if (Math.max(...Object.values(this.fast)) < 0.025) next = "silence";
    else if (
      now - this.firstSample > 3500 &&
      fast < Math.max(0.09, slow * 0.62)
    )
      next = "break";
    else if (
      fast > 0.38 &&
      fast > slow * 1.55 &&
      this.fast.bass > this.medium.bass + 0.15
    )
      next = "peak";
    else if (
      (this.section !== "peak" || now - this.sectionSince > 12000) &&
      fast > Math.max(0.25, mid * 1.06) &&
      fast - mid > 0.025 &&
      (this.fast.high > this.medium.high * 1.08 ||
        this.fast.mid > this.medium.mid * 1.08)
    )
      next = "build";
    else if (
      (this.section === "peak" &&
        now - this.sectionSince < 12000 &&
        fast > 0.3) ||
      (mid > 0.55 && this.medium.bass > 0.6) ||
      (fast > Math.max(0.42, slow * 1.3) && this.fast.bass > 0.42)
    )
      next = "peak";
    else if (mid > 0.27 && this.medium.bass > 0.24) next = "drive";
    else next = "calm";
    // Hysteresis: no visual section change for a lone kick, cymbal or brief dip.
    if (next !== this.candidate) {
      this.candidate = next;
      this.candidateSince = now;
    }
    const settle =
      next === "build"
        ? 850
        : next === "peak"
          ? 1000
          : next === "break"
            ? 1700
            : next === "silence"
              ? 1600
              : 2200;
    if (next !== this.section && now - this.candidateSince >= settle) {
      this.section = next;
      this.sectionSince = now;
    }
  }
  accentStyle(
    settings: VibesSettings,
    accent: "bass" | "upbeat" | "treble",
  ): Effect | null {
    const options = selectedVibes(settings);
    if (settings.rotation !== "musical" || options.length === 1)
      return accent !== "bass" && options[0] === "contrast"
        ? null
        : this.style || options[0];
    if (
      this.style &&
      (accent === "bass"
        ? ["shapes", "tunnel", "contrast"].includes(this.style)
        : ["rays", "prism", "wave"].includes(this.style))
    )
      return this.style;
    const priority: Effect[] =
      accent === "bass"
        ? this.section === "peak" && this.confidence >= 0.55
          ? [
              "contrast",
              "tunnel",
              "shapes",
              "wave",
              "prism",
              "halo",
              "aurora",
              "rays",
            ]
          : ["shapes", "tunnel", "wave", "prism", "halo", "aurora", "rays"]
        : accent === "upbeat"
          ? ["rays", "prism", "wave", "aurora", "halo", "shapes", "tunnel"]
          : ["prism", "rays", "aurora", "wave", "halo", "shapes", "tunnel"];
    return priority.find((s) => options.includes(s)) || null;
  }
  status(): DirectorStatus {
    return {
      section: this.section,
      style: this.style,
      bpm: this.bpm,
      confidence: this.confidence,
      reason: this.reason,
    };
  }
  private score(style: Effect, now: number) {
    const [bass, mid, bright] = this.shape();
    const rhythm = this.confidence,
      energy = this.energy(this.medium);
    const table: Record<MusicalSection, Record<Effect, number>> = {
      silence: {
        halo: 1,
        aurora: 0.8,
        prism: 0.2,
        wave: 0,
        shapes: 0,
        tunnel: 0,
        rays: 0,
        contrast: -2,
      },
      calm: {
        halo: 0.9,
        aurora: 0.85,
        prism: 0.55,
        wave: 0.25,
        shapes: 0,
        tunnel: -0.2,
        rays: 0,
        contrast: -1,
      },
      build: {
        halo: 0.15,
        aurora: 0.65,
        prism: 0.85,
        wave: 0.9,
        shapes: 0.35,
        tunnel: 0.6,
        rays: 0.8,
        contrast: -0.2,
      },
      drive: {
        halo: 0.1,
        aurora: 0.3,
        prism: 0.65,
        wave: 0.7,
        shapes: 0.85,
        tunnel: 0.75,
        rays: 0.6,
        contrast: 0.05,
      },
      peak: {
        halo: 0,
        aurora: 0.15,
        prism: 0.5,
        wave: 0.5,
        shapes: 0.8,
        tunnel: 0.95,
        rays: 0.8,
        contrast: 0.5,
      },
      break: {
        halo: 1,
        aurora: 0.95,
        prism: 0.5,
        wave: 0.15,
        shapes: 0,
        tunnel: -0.3,
        rays: -0.1,
        contrast: -1.5,
      },
    };
    const affinity: Record<Effect, number> = {
      halo: mid * 0.2,
      aurora: bright * 0.8,
      prism: mid * 0.55 + bright * 0.35,
      wave: mid * 0.45 + rhythm * 0.2,
      shapes: bass * 0.8 + rhythm * 0.35,
      tunnel: bass * 0.7 + energy * 0.25,
      rays: bright * 0.8 + rhythm * 0.2,
      contrast: rhythm * 0.65 + bass * 0.6,
    };
    const last = this.uses.get(style);
    const recent =
      last === undefined ? 0 : Math.max(0, 1 - (now - last) / 90000) * 0.36;
    return table[this.section][style] + affinity[style] - recent;
  }
  choose(settings: VibesSettings, song: string, now: number): Effect {
    const options = selectedVibes(settings),
      signature = JSON.stringify([
        options,
        settings.rotation,
        settings.minutes,
      ]);
    const songChanged = !!song && !!this.song && song !== this.song;
    if (songChanged) {
      this.memories = [];
      this.uses.clear();
      this.intervals = [];
      this.beatCount = 0;
      this.anchor = { ...this.medium };
      this.lastBeat = -Infinity;
      this.bpm = null;
      this.confidence = 0;
      this.fast = { ...this.input };
      this.medium = { ...this.input };
      this.slow = { ...this.input };
      this.section = "calm";
      this.candidate = "calm";
      this.candidateSince = now;
      this.sectionSince = now;
      this.firstSample = now;
      this.signalSince = now;
      this.signalPrimed = false;
    }
    const configuration = !this.style || signature !== this.signature;
    const age = now - this.changed;
    const sectionPending = this.sectionSince > this.changed;
    const novelty =
      (["bass", "mid", "high", "air"] as const).reduce(
        (v, k) => v + Math.abs(this.medium[k] - this.anchor[k]),
        0,
      ) / 4;
    const musicalChange =
      sectionPending ||
      (novelty > 0.095 &&
        this.candidate === this.section &&
        !["break", "silence"].includes(this.section));
    const phraseLength = this.bpm
      ? Math.max(12000, (32 * 60000) / this.bpm)
      : 32000;
    const phraseVariation =
      age >= phraseLength &&
      this.section !== "silence" &&
      this.section !== "break";
    const minimum =
      this.visualSection === "build" && sectionPending
        ? 3500
        : this.section === "build" || this.section === "peak"
          ? 6500
          : this.section === "break"
            ? 3500
            : 12000;
    const firstSignal =
      settings.rotation === "musical" &&
      !this.signalPrimed &&
      this.signalSince !== null &&
      now - this.signalSince >= 1500;
    const due =
      configuration ||
      firstSignal ||
      (settings.rotation !== "fixed" && songChanged) ||
      (settings.rotation === "minutes" && age >= settings.minutes * 60000) ||
      (settings.rotation === "musical" &&
        age >= minimum &&
        (musicalChange || phraseVariation));
    if (!due) {
      this.pendingSince = null;
      this.pendingKey = "";
    }
    if (due) {
      const key = signature + this.section;
      if (this.pendingSince === null || this.pendingKey !== key) {
        this.pendingSince = now;
        this.pendingKey = key;
      }
      const onBeat = now - this.lastBeat < 150 && this.beatCount % 4 === 1;
      const aligned =
        configuration ||
        firstSignal ||
        songChanged ||
        settings.rotation !== "musical" ||
        this.confidence < 0.55 ||
        onBeat ||
        now - this.pendingSince > 2500;
      if (aligned) {
        let candidates = options.filter((s) => s !== this.style);
        if (!candidates.length) candidates = options;
        let chosen: Effect;
        let remembered = false;
        if (settings.rotation === "musical") {
          const gentle = options.filter(
            (s) =>
              s !== "contrast" ||
              (this.section === "peak" && this.confidence >= 0.55),
          );
          const eligible = gentle.length ? gentle : options;
          candidates = eligible.filter((s) => s !== this.style);
          if (!candidates.length) candidates = eligible;
          const shape = this.shape();
          const memory = this.memories
            .filter(
              (m) => m.section === this.section && eligible.includes(m.style),
            )
            .map((m) => ({
              memory: m,
              distance: m.shape.reduce(
                (sum, v, i) => sum + Math.abs(v - shape[i]),
                0,
              ),
            }))
            .sort((a, b) => a.distance - b.distance)
            .find((m) => m.distance < 0.18)?.memory;
          if (memory && sectionPending && memory.style !== this.style) {
            chosen = memory.style;
            remembered = true;
          } else
            chosen = [
              ...(phraseVariation && !musicalChange ? candidates : eligible),
            ].sort((a, b) => this.score(b, now) - this.score(a, now))[0];
          if (!memory && this.section !== "silence") {
            this.memories.push({
              section: this.section,
              shape: [...shape],
              style: chosen,
            });
            if (this.memories.length > 16) this.memories.shift();
          }
          this.reason = remembered
            ? "Vuelve el motivo visual de un tramo parecido"
            : this.section === "peak"
              ? "Graves y energía altos; acento en el pulso"
              : this.section === "build"
                ? "Crecen la energía y las frecuencias de presencia"
                : this.section === "break"
                  ? "Baja sostenida; dejamos respirar la imagen"
                  : phraseVariation && !musicalChange
                    ? "Variación complementaria al cerrar un bloque musical"
                    : "Selección según las bandas dominantes y el ritmo";
        } else {
          chosen =
            candidates[
              Math.min(
                candidates.length - 1,
                Math.floor(this.random() * candidates.length),
              )
            ];
          this.reason =
            settings.rotation === "song"
              ? "Cambio de canción"
              : settings.rotation === "minutes"
                ? "Intervalo de tiempo elegido"
                : "Efecto mantenido";
        }
        if (chosen !== this.style) {
          this.style = chosen;
          this.uses.set(chosen, now);
        }
        if (firstSignal) this.signalPrimed = true;
        this.visualSection = this.section;
        this.changed = now;
        this.anchor = { ...this.medium };
        this.pendingSince = null;
      }
    }
    this.signature = signature;
    if (song) this.song = song;
    return this.style || options[0];
  }
}

export type MusicBands = {
  bass: number;
  mid: number;
  high: number;
  air: number;
};
export const silentBands: MusicBands = { bass: 0, mid: 0, high: 0, air: 0 };
export function analyserSpectrum(
  analyser: AnalyserNode,
  bins: Float32Array<ArrayBuffer>,
  sampleRate: number,
): MusicBands {
  analyser.getFloatFrequencyData(bins);
  const band = (lowHz: number, highHz: number) => {
    const low = Math.max(1, Math.ceil((lowHz * analyser.fftSize) / sampleRate));
    const high = Math.min(
      bins.length - 1,
      Math.floor((highHz * analyser.fftSize) / sampleRate),
    );
    let power = 0;
    for (let i = low; i <= high; i++)
      if (Number.isFinite(bins[i])) power += 10 ** (bins[i] / 10);
    if (!power || high < low) return 0;
    return Math.max(
      0,
      Math.min(1, (10 * Math.log10(power / (high - low + 1)) + 60) / 60),
    );
  };
  return {
    bass: band(45, 150),
    mid: band(150, 900),
    high: band(900, 4000),
    air: band(4000, 12000),
  };
}

/** Separate high-band attacks from bass hits. Upbeat means an estimated offbeat,
 * not semantic recognition of the score. Never routes high-only attacks to inversion. */
export class SpectralAccentDetector {
  private lastBass = -Infinity;
  private lastHigh = -Infinity;
  private previous = 0;
  private average = 0;
  private armed = true;
  sample(
    bands: MusicBands,
    bassBeat: boolean,
    threshold: number,
    bpm: number | null,
    now: number,
  ): "upbeat" | "treble" | null {
    if (bassBeat) this.lastBass = now;
    const level = Math.max(bands.high, bands.air),
      baseline = this.average;
    this.average = this.average * 0.9 + level * 0.1;
    const gate = Math.max(
      0.1,
      Math.min(threshold * 0.85, baseline * 0.95 + 0.06),
    );
    if (level < gate * 0.8) this.armed = true;
    const onset =
      this.armed || (level > this.previous + 0.035 && level > baseline * 1.1);
    this.previous = level;
    if (level < gate || !onset || now - this.lastHigh < 160) return null;
    this.armed = false;
    if (bassBeat || now - this.lastBass < 110) return null;
    this.lastHigh = now;
    const period = bpm ? 60000 / bpm : 500,
      offset = now - this.lastBass;
    return offset >= period * 0.28 && offset <= period * 0.8
      ? "upbeat"
      : "treble";
  }
}
