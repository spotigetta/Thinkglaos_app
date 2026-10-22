import fs from "node:fs";
import { execFileSync } from "node:child_process";

// Proposal for 29 October, anchored to the previous edition (17:30 delivery,
// 19:30 access ready) and the published 20:00–23:30 event. No supplier booking implied.
const plan = {
  "planning-0": ["2026-10-22", "18:00–18:30"],
  "planning-1": ["2026-10-22", "18:30–19:00"],
  "planning-2": ["2026-10-23", "18:00–18:30"],
  "planning-3": ["2026-10-23", "18:30–19:30"],
  "manual-001": ["2026-10-22", "19:00–19:15"],
  "manual-002": ["2026-10-27", "18:00–18:15"],
  "manual-003": ["2026-10-26", "18:00–18:20"],
  "manual-004": ["2026-10-26", "18:20–19:00"],
  "manual-006": [
    "2026-10-28",
    "18:00–18:15",
    "Preparar alternativa si falla Mercadona; activarla solo si hay incidencia el día del evento.",
  ],
  "manual-007": ["2026-10-28", "18:15–18:45"],
  "operativa-clima": ["2026-10-29", "17:00–17:20"],
  "manual-005": [
    "2026-10-29",
    "17:30–17:45",
    "Referencia de la edición anterior: recepción a las 17:30. Confirmar la franja del pedido para esta edición.",
  ],
  "manual-008": ["2026-10-29", "17:40–18:15"],
  "manual-009": ["2026-10-29", "17:45–18:30"],
  "manual-010": ["2026-10-29", "18:00–18:45"],
  "manual-011": ["2026-10-29", "18:45–19:00"],
  "manual-012": ["2026-10-29", "19:00–19:15"],
  "manual-013": [
    "2026-10-29",
    "19:15–19:30",
    "Instalar y probar la app antes: a las 19:30 el lector debe estar listo en puerta.",
  ],
  "manual-018": [
    "2026-10-29",
    "19:15–19:30",
    "Acoger a Laura y probar el micro antes de abrir. Mantener una persona de referencia durante toda la velada.",
  ],
  "manual-014": ["2026-10-29", "19:30–20:00"],
  "manual-015": ["2026-10-29", "19:30–20:00"],
  "manual-016": ["2026-10-29", "19:30–20:00"],
  "manual-017": ["2026-10-29", "20:00–23:30"],
  "operativa-cuidados": ["2026-10-29", "20:00–23:30"],
  "manual-019": [
    "2026-10-29",
    "20:25–20:30",
    "Guion propuesto: bienvenida a las 20:00; presentación 20:25; intervención de Laura 20:30–20:48; preguntas 20:48–21:33; conversación y comida después. Confirmar con la ponente.",
  ],
  "manual-020": [
    "2026-10-29",
    "21:30–21:45",
    "Hora objetivo, pendiente de confirmar con la pizzería. Coordinar recepción sin interrumpir las preguntas.",
  ],
  "operativa-cierre": ["2026-10-29", "23:30–23:40"],
  "manual-023": ["2026-10-29", "23:40–23:55"],
  "manual-021": ["2026-10-29", "23:30–23:55"],
  "manual-022": ["2026-10-30", "18:00–18:30"],
  "manual-024": ["2026-10-30", "18:30–19:00"],
};
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
for (let attempt = 0; attempt < 5; attempt++) {
  const response = await fetch(url + "?ref=data&t=" + Date.now(), { headers });
  if (!response.ok) throw Error("Lectura " + response.status);
  const file = await response.json();
  const state = JSON.parse(
    Buffer.from(file.content, "base64").toString("utf8"),
  );
  fs.mkdirSync(".local", { recursive: true });
  fs.writeFileSync(
    ".local/before-event-schedule.json",
    JSON.stringify(state, null, 2),
  );
  let changed = 0;
  for (const task of state.tasks) {
    const row = plan[task.id];
    if (task.eventId !== "toledo-proxima" || !row || task.scheduledDate)
      continue;
    task.scheduledDate = row[0];
    task.time = row[1] + " · propuesta";
    if (row[2]) task.notes = [...new Set([...task.notes, row[2]])];
    task.updatedAt = new Date().toISOString();
    changed++;
  }
  if (!changed) {
    console.log(
      "El horario ya estaba aplicado; se conservan las ediciones posteriores.",
    );
    break;
  }
  state.revision++;
  state.updatedAt = new Date().toISOString();
  const content = JSON.stringify(state, null, 2) + "\n";
  const saved = await fetch(url, {
    method: "PUT",
    headers,
    body: JSON.stringify({
      branch: "data",
      sha: file.sha,
      message: "Programar preparación, montaje y cierre del 29 de octubre",
      content: Buffer.from(content).toString("base64"),
    }),
  });
  if (saved.ok) {
    fs.writeFileSync("public/data/seed.json", content);
    console.log(
      "Horario asignado a",
      changed,
      "tareas; revisión",
      state.revision,
    );
    break;
  }
  if (![409, 422].includes(saved.status) || attempt === 4)
    throw Error("Guardado " + saved.status);
}
