import { normalize, type Member } from "./model";
export function rosterNames(text: string, members: Member[]) {
  const existing = new Set(members.map((m) => normalize(m.name.trim()))),
    fresh: string[] = [],
    duplicates: string[] = [];
  for (const line of text.split(/[\n;]+/)) {
    const name = line.trim().replace(/\s+/g, " ");
    if (!name) continue;
    const key = normalize(name);
    if (existing.has(key)) duplicates.push(name);
    else {
      fresh.push(name);
      existing.add(key);
    }
  }
  return { fresh, duplicates };
}
export function daysUntil(date: string, now = new Date()) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Europe/Madrid",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(now),
    get = (key: string) => parts.find((p) => p.type === key)?.value;
  const today = Date.UTC(
      Number(get("year")),
      Number(get("month")) - 1,
      Number(get("day")),
    ),
    [y, m, d] = date.split("-").map(Number);
  return Math.round((Date.UTC(y, m - 1, d) - today) / 86400000);
}
