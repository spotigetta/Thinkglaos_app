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
) {
  const secondsLeft = Math.max(0, 3600 - elapsed);
  const remaining = sceneCues(cues, "pizzas").filter(
    (cue) => !played.has(cue.url),
  );
  const audioSeconds = remaining.reduce(
    (sum, cue) => sum + Math.max(0, cue.end - cue.start),
    0,
  );
  return {
    secondsLeft,
    remaining,
    audioSeconds,
    gap: remaining.length
      ? Math.max(0, (secondsLeft - audioSeconds) / remaining.length)
      : 0,
  };
}

/** Distribute each remaining montage cue once across the time left until 19:25 Madrid time. */
export function montagePace(
  cues: ShowCue[],
  played: ReadonlySet<string>,
  now: Date,
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
  const remaining = sceneCues(cues, "montaje").filter(
    (cue) => !played.has(cue.url),
  );
  const audioSeconds = remaining.reduce(
    (sum, cue) => sum + Math.max(0, cue.end - cue.start),
    0,
  );
  return {
    secondsLeft,
    remaining,
    audioSeconds,
    gap: remaining.length
      ? Math.max(0, (secondsLeft - audioSeconds) / remaining.length)
      : 0,
  };
}
