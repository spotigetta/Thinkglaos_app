import fs from "node:fs";
import { execFileSync } from "node:child_process";
const credential = execFileSync("git", ["credential", "fill"], {
  input: "protocol=https\nhost=github.com\n\n",
  encoding: "utf8",
  stdio: ["pipe", "pipe", "pipe"],
});
const token = credential
  .split(/\r?\n/)
  .find((line) => line.startsWith("password="))
  ?.slice(9);
if (!token) throw Error("Falta credencial Git");
const url =
  "https://api.github.com/repos/spotigetta/Thinkglaos_app/contents/data/state.json";
const headers = {
  Authorization: "Bearer " + token,
  Accept: "application/vnd.github+json",
  "Content-Type": "application/json",
};
// Named responsibilities, balanced across preparation, access, food, stage and closing.
const assignments = {
  "planning-0": "Pablo Ramírez",
  "planning-1": "Pablo Ramírez",
  "planning-2": "Pablo Ramírez",
  "planning-3": "Mery Marcos",
  "manual-001": "Pablo Ramírez",
  "manual-002": "Javier Yuste",
  "manual-003": "Pablo Ramírez",
  "manual-004": "Pablo Ramírez",
  "manual-005": "Alejandro Zamora",
  "manual-006": "Pablo Ramírez",
  "manual-007": "Pablo Ramírez",
  "manual-008": "Daniel Ramírez",
  "manual-009": "Teresa",
  "manual-010": "Juan María",
  "manual-011": "Javier Yuste",
  "manual-012": "Pablo Ramírez",
  "manual-013": "Lucía López",
  "manual-014": "Mery Marcos",
  "manual-015": "Lucía López",
  "manual-016": "Pablo Ramírez",
  "manual-017": "Mery Marcos",
  "manual-018": "Javier Yuste",
  "manual-019": "Pablo Ramírez",
  "manual-020": "Alejandro Zamora",
  "manual-021": "Daniel Ramírez",
  "manual-022": "Pablo Ramírez",
  "manual-023": "Juan María",
  "manual-024": "Mery Marcos",
  "operativa-clima": "Javier Yuste",
  "operativa-cuidados": "Teresa",
  "operativa-cierre": "Juan María",
};
for (let attempt = 0; attempt < 5; attempt++) {
  const response = await fetch(url + "?ref=data&t=" + Date.now(), { headers });
  if (!response.ok) throw Error("Lectura " + response.status);
  const file = await response.json();
  const state = JSON.parse(
    Buffer.from(file.content, "base64").toString("utf8"),
  );
  fs.writeFileSync(
    ".local/before-team-assignment.json",
    JSON.stringify(state, null, 2),
  );
  const names = new Set(state.members.map((m) => m.name));
  let changed = 0;
  for (const task of state.tasks) {
    if (task.eventId !== "toledo-proxima" || !assignments[task.id]) continue;
    // Preserve any real personal assignment or completed task that arrived meanwhile.
    if (names.has(task.assignedTo) || task.isDone) continue;
    task.assignedTo = assignments[task.id];
    task.updatedAt = new Date().toISOString();
    changed++;
    if (task.id === "manual-010")
      task.notes = [
        ...new Set([
          ...task.notes,
          "Apoyo de decoración: Mery Marcos, al terminar difusión, antes de la recepción.",
        ]),
      ];
    if (task.id === "manual-021")
      task.notes = [
        ...new Set([
          ...task.notes,
          "Coordina Daniel; recogida y limpieza entre todo el equipo.",
        ]),
      ];
    if (task.id === "manual-021") task.time = "Desde 23:30";
  }
  if (!changed) {
    console.log("El evento ya tiene responsables asignados.");
    break;
  }
  state.revision++;
  state.updatedAt = new Date().toISOString();
  const saved = await fetch(url, {
    method: "PUT",
    headers,
    body: JSON.stringify({
      branch: "data",
      sha: file.sha,
      message: "Repartir tareas concretas entre los ocho integrantes",
      content: Buffer.from(JSON.stringify(state, null, 2) + "\n").toString(
        "base64",
      ),
    }),
  });
  if (saved.ok) {
    fs.writeFileSync(
      "public/data/seed.json",
      JSON.stringify(state, null, 2) + "\n",
    );
    console.log(
      "Asignadas",
      changed,
      "tareas. Responsables:",
      Object.fromEntries(
        state.members.map((m) => [
          m.name,
          state.tasks.filter(
            (t) => t.eventId === "toledo-proxima" && t.assignedTo === m.name,
          ).length,
        ]),
      ),
    );
    break;
  }
  if (![409, 422].includes(saved.status) || attempt === 4)
    throw Error("Guardado " + saved.status);
}
