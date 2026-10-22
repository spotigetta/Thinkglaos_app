import { test } from "node:test";
import assert from "node:assert/strict";
import { daysUntil, rosterNames } from "../lib/team-flow";
test("La incorporación limpia nombres y evita duplicados con tildes, espacios o mayúsculas", () => {
  const members = [
    { id: "1", name: "María Marcos", role: "Voluntaria", note: "" },
  ];
  const result = rosterNames(
    " María Marcos\nAna García\n ana garcia ; Luis   Pérez\n",
    members,
  );
  assert.deepEqual(result.fresh, ["Ana García", "Luis Pérez"]);
  assert.deepEqual(result.duplicates, ["María Marcos", "ana garcia"]);
});
test("La cuenta atrás usa días de Madrid, también al cambiar a horario de invierno", () => {
  assert.equal(daysUntil("2026-10-29", new Date("2026-10-22T12:00:00Z")), 7);
  assert.equal(daysUntil("2026-10-29", new Date("2026-10-28T23:30:00Z")), 0);
  assert.equal(daysUntil("2026-10-29", new Date("2026-10-30T12:00:00Z")), -1);
  assert.equal(daysUntil(""), null);
});
