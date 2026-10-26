export type VoiceScene =
  "montaje" | "ambiente" | "llamada" | "agradecimiento" | "pizzas";
export type ShowCue = {
  start: number;
  end: number;
  text: string;
  voice: number;
  url: string;
  scenes?: VoiceScene[];
  block?: string;
  automatic?: boolean;
  note?: string;
};
export const voiceSceneLabels: Record<VoiceScene, string> = {
  montaje: "Montaje",
  ambiente: "Ambientillo",
  llamada: "A sentarse",
  agradecimiento: "Agradecimiento",
  pizzas: "Pizzas",
};
export function cueScenes(c: ShowCue): VoiceScene[] {
  return c.scenes || (c.voice === 3 ? ["llamada"] : ["ambiente"]);
}
// Round robin across voices; source order within each voice is preserved.
export function sceneCues(cues: ShowCue[], phase: string): ShowCue[] {
  const groups = new Map<number, ShowCue[]>();
  for (const c of cues.filter(
    (c) => c.automatic !== false && cueScenes(c).includes(phase as VoiceScene),
  )) {
    if (!groups.has(c.voice)) groups.set(c.voice, []);
    groups.get(c.voice)!.push(c);
  }
  const result: ShowCue[] = [];
  for (let i = 0; [...groups.values()].some((g) => g[i]); i++) {
    for (const group of groups.values()) if (group[i]) result.push(group[i]);
  }
  return result;
}
export function nextCue(
  cues: ShowCue[],
  phase: string,
  lastUrl: string,
): ShowCue | undefined {
  const pool = sceneCues(cues, phase),
    i = pool.findIndex((c) => c.url === lastUrl);
  return pool[(i + 1) % pool.length];
}
export function voiceGap(value: number) {
  return Math.max(10, Math.min(240, Number.isFinite(value) ? value : 60));
}

export function pizzasPace(
  cues: ShowCue[],
  played: ReadonlySet<string>,
  elapsed: number,
  coverage = 1,
) {
  const secondsLeft = Math.max(0, 3600 - elapsed);
  return timedVoicePace(cues, "pizzas", played, secondsLeft, coverage);
}

/** Distribute each remaining montage cue once across the time left until 19:25 Madrid time. */
export function montagePace(
  cues: ShowCue[],
  played: ReadonlySet<string>,
  now: Date,
  coverage = 1,
) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Madrid",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const part = (name: string) =>
    Number(parts.find((item) => item.type === name)?.value || 0);
  const secondsLeft = Math.max(
    0,
    19 * 3600 +
      25 * 60 -
      (part("hour") * 3600 + part("minute") * 60 + part("second")),
  );
  return timedVoicePace(cues, "montaje", played, secondsLeft, coverage);
}

export type VoiceCoverage = Record<"montaje" | "ambiente" | "pizzas", number>;
export function readVoiceCoverage(
  input: Partial<VoiceCoverage> = {},
): VoiceCoverage {
  const clean = (n: unknown) =>
    typeof n === "number" && Number.isFinite(n)
      ? Math.max(0, Math.min(1, n))
      : 1;
  return {
    montaje: clean(input.montaje),
    ambiente: clean(input.ambiente),
    pizzas: clean(input.pizzas),
  };
}
export function timedVoicePace(
  cues: ShowCue[],
  phase: string,
  played: ReadonlySet<string>,
  seconds: number,
  coverage = 1,
) {
  const pool = sceneCues(cues, phase),
    total = pool.length;
  const target = Math.round(total * Math.max(0, Math.min(1, coverage)));
  const completed = pool.filter((c) => played.has(c.url)).length;
  const available = pool.filter((c) => !played.has(c.url));
  const count = Math.max(0, Math.min(available.length, target - completed));
  // Stable, evenly distributed subset; changing the slider never replays completed cues.
  const preferred = Array.from(
    { length: target },
    (_, i) => pool[Math.floor((i * total) / target)],
  );
  const remaining = preferred.filter((c) => !played.has(c.url)).slice(0, count);
  for (const cue of available)
    if (remaining.length < count && !remaining.includes(cue))
      remaining.push(cue);
  remaining.sort((a, b) => pool.indexOf(a) - pool.indexOf(b));
  const secondsLeft = Math.max(0, seconds);
  const audioSeconds = remaining.reduce(
    (sum, c) => sum + Math.max(0, c.end - c.start),
    0,
  );
  return {
    secondsLeft,
    remaining,
    audioSeconds,
    total,
    target,
    completed,
    gap: count ? Math.max(0, (secondsLeft - audioSeconds) / count) : 0,
  };
}
export function ambientPace(
  cues: ShowCue[],
  played: ReadonlySet<string>,
  elapsed: number,
  minutes = 30,
  coverage = 1,
) {
  return timedVoicePace(
    cues,
    "ambiente",
    played,
    Math.max(0, minutes * 60 - 180 - elapsed),
    coverage,
  );
}
