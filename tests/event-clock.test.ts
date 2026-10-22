import { test } from "node:test";
import assert from "node:assert/strict";
import {
  madridClock,
  taskMinutes,
  timelineSlots,
  markerPosition,
} from "../lib/event-clock";
import { Phase } from "../types";
import type { EventTask } from "../lib/model";
const task = (
  id: string,
  time: string,
  phase = Phase.AFTERNOON_BEFORE,
): EventTask => ({
  id,
  time,
  phase,
  title: id,
  assignedTo: "Pablo",
  originalRole: "Embajador",
  eventId: "event",
  notes: [],
  isDone: false,
});
test("El reloj usa Madrid y cambia a CET en octubre", () => {
  assert.equal(madridClock(new Date("2026-10-22T15:30:00Z")).time, "17:30:00");
  assert.equal(madridClock(new Date("2026-10-29T16:30:00Z")).time, "17:30:00");
  assert.equal(
    madridClock(new Date("2026-10-22T23:30:00Z")).date,
    "2026-10-23",
  );
});
test("La cronología ordena y agrupa sin inventar hora a los trabajos previos", () => {
  const slots = timelineSlots([
    task("qr", "19:30 · propuesta"),
    task("a", "17:30 · propuesta"),
    task("b", "17:30"),
    task("pre", "Día anterior", Phase.WEEK_BEFORE),
  ]);
  assert.deepEqual(
    slots.map((s) => s.label),
    ["Trabajos previos", "17:30", "19:30"],
  );
  assert.equal(slots[1].tasks.length, 2);
  assert.equal(taskMinutes(task("limite", "Antes de las 20:00")), null);
});
test("El marcador se interpola entre las horas y permanece dentro del eje", () => {
  const points = [
    { minutes: 1050, top: 100 },
    { minutes: 1170, top: 300 },
  ];
  assert.equal(markerPosition(points, 1110), 200);
  assert.equal(markerPosition(points, 1000), 100);
  assert.equal(markerPosition(points, 1400), 300);
});
