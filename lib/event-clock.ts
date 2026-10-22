import type { EventTask } from "./model";
import { Phase } from "../types";
import { normalizePhase } from "./plan";
export function madridClock(now: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const value = (type: string) =>
    parts.find((p) => p.type === type)?.value || "00";
  return {
    date: `${value("year")}-${value("month")}-${value("day")}`,
    time: `${value("hour")}:${value("minute")}:${value("second")}`,
    minutes:
      Number(value("hour")) * 60 +
      Number(value("minute")) +
      Number(value("second")) / 60,
  };
}
export function taskMinutes(task: EventTask) {
  const match = task.time?.match(/\b([01]\d|2[0-3]):([0-5]\d)\b/);
  // "Antes de las 20:00" is a deadline, not a scheduled start.
  if (!match || /^antes\b/i.test(task.time || "")) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}
export function compareTaskSchedule(a: EventTask, b: EventTask) {
  const dateOrder = (a.scheduledDate || "9999").localeCompare(
    b.scheduledDate || "9999",
  );
  return (
    dateOrder ||
    (taskMinutes(a) ?? 1440) - (taskMinutes(b) ?? 1440) ||
    a.title.localeCompare(b.title, "es")
  );
}
export type TimelineSlot = {
  key: string;
  label: string;
  minutes: number | null;
  tasks: EventTask[];
};
export function timelineSlots(tasks: EventTask[]): TimelineSlot[] {
  const before = tasks.filter(
    (t) =>
      taskMinutes(t) === null && normalizePhase(t.phase) === Phase.WEEK_BEFORE,
  );
  const untimed = tasks.filter(
    (t) =>
      taskMinutes(t) === null && normalizePhase(t.phase) !== Phase.WEEK_BEFORE,
  );
  const timed = new Map<number, EventTask[]>();
  for (const task of [...tasks].sort(compareTaskSchedule)) {
    const minutes = taskMinutes(task);
    if (minutes !== null)
      timed.set(minutes, [...(timed.get(minutes) || []), task]);
  }
  const result: TimelineSlot[] = before.length
    ? [
        {
          key: "before",
          label: "Trabajos previos",
          minutes: null,
          tasks: before,
        },
      ]
    : [];
  for (const [minutes, rows] of [...timed.entries()].sort(([a], [b]) => a - b))
    result.push({
      key: String(minutes),
      label:
        String(Math.floor(minutes / 60)).padStart(2, "0") +
        ":" +
        String(minutes % 60).padStart(2, "0"),
      minutes,
      tasks: rows,
    });
  if (untimed.length)
    result.push({
      key: "untimed",
      label: "Sin hora concreta · coordinar",
      minutes: null,
      tasks: untimed,
    });
  return result;
}
export function markerPosition(
  points: { minutes: number; top: number }[],
  current: number,
) {
  if (!points.length) return 0;
  if (current <= points[0].minutes) return points[0].top;
  const last = points[points.length - 1];
  if (current >= last.minutes) return last.top;
  for (let i = 1; i < points.length; i++)
    if (current <= points[i].minutes) {
      const a = points[i - 1],
        b = points[i];
      return (
        a.top +
        ((b.top - a.top) * (current - a.minutes)) / (b.minutes - a.minutes)
      );
    }
  return last.top;
}
