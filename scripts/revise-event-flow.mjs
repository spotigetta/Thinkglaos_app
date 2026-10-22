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
const migration = "flow-from-17-v2";
const slots = {
  "operativa-clima": ["2026-10-29", "17:00–17:20"],
  "manual-010": ["2026-10-29", "17:00–17:45"],
  "manual-005": ["2026-10-29", "17:30–17:45"],
  "manual-008": ["2026-10-29", "17:45–18:15"],
  "manual-009": ["2026-10-29", "17:45–18:30"],
  "manual-011": ["2026-10-29", "18:30–19:00"],
  "manual-020": ["2026-10-29", "21:40–22:00"],
  "manual-022": ["2026-10-30", "18:00–18:30"],
  "manual-024": ["2026-10-30", "18:30–19:00"],
};
for (let attempt = 0; attempt < 5; attempt++) {
  const read = await fetch(url + "?ref=data&t=" + Date.now(), { headers });
  if (!read.ok) throw Error("Lectura " + read.status);
  const file = await read.json();
  const state = JSON.parse(
    Buffer.from(file.content, "base64").toString("utf8"),
  );
  if (state.appliedOps.includes(migration)) {
    console.log("Flujo ya actualizado; se conservan cambios posteriores.");
    break;
  }
  fs.mkdirSync(".local", { recursive: true });
  fs.writeFileSync(
    ".local/before-flow-from-17.json",
    JSON.stringify(state, null, 2),
  );
  const eventTasks = state.tasks.filter((t) => t.eventId === "toledo-proxima");
  const main = eventTasks.find((t) => t.id === "manual-005");
  if (!main)
    throw Error(
      "No se encontró la tarea de recepción; no se elimina ninguna tarjeta.",
    );
  const extra = eventTasks.filter((t) =>
    ["manual-004", "manual-006"].includes(t.id),
  );
  const doneNotes = new Set(
    (main.completedSteps || []).map((i) => main.notes[i]),
  );
  for (const task of extra) {
    for (const [i, note] of task.notes.entries()) {
      const merged =
        (task.id === "manual-004"
          ? "Pedido previo · Pablo: "
          : "Solo si falla la entrega · Pablo: ") + note;
      if (!main.notes.includes(merged)) main.notes.push(merged);
      if (task.isDone || task.completedSteps?.includes(i))
        doneNotes.add(merged);
    }
  }
  main.completedSteps = main.notes.flatMap((note, i) =>
    doneNotes.has(note) ? [i] : [],
  );
  state.tasks = state.tasks.filter(
    (t) =>
      t.eventId !== "toledo-proxima" ||
      !["manual-004", "manual-006"].includes(t.id),
  );
  for (const task of eventTasks) {
    const row = slots[task.id];
    if (row) {
      task.scheduledDate = row[0];
      task.time = row[1] + " · propuesta";
      task.updatedAt = new Date().toISOString();
    }
  }
  const event = state.events.find((e) => e.id === "toledo-proxima");
  if (event)
    event.notes =
      "29 octubre 2026 · 20:00–23:30 · Claustro Santo Tomé, Pl. del Conde, 4, Toledo. Equipo desde las 17:00. Mercadona 17:30 y QR listo 19:30, basados en la edición anterior. Las horas de trabajo son propuestas; confirmar entrega de pizzas. Material con Pablo Ramírez.";
  for (const [id, name, path] of [
    [
      "voluntarios-salsa",
      "El verdadero secreto de la salsa de ITTT",
      "voluntarios-secreto-salsa.mp4",
    ],
    [
      "voluntarios-toledo",
      "Prepárate para hacer historia en Toledo",
      "voluntarios-historia-toledo.mp4",
    ],
  ])
    if (!state.resources.some((r) => r.id === id))
      state.resources.push({
        id,
        name,
        kind: "video",
        url: "./media/" + path,
        notes: "Destacado para voluntarios · vídeo original en máxima calidad",
      });
  state.appliedOps.push(migration);
  state.revision++;
  state.updatedAt = new Date().toISOString();
  const content = JSON.stringify(state, null, 2) + "\n";
  const saved = await fetch(url, {
    method: "PUT",
    headers,
    body: JSON.stringify({
      branch: "data",
      sha: file.sha,
      message: "Unificar Mercadona y ordenar montaje desde las 17:00",
      content: Buffer.from(content).toString("base64"),
    }),
  });
  if (saved.ok) {
    fs.writeFileSync("public/data/seed.json", content);
    console.log(
      "Flujo actualizado: una tarjeta Mercadona, tareas desde las 17:00 y vídeos de voluntarios. Revisión",
      state.revision,
    );
    break;
  }
  if (![409, 422].includes(saved.status) || attempt === 4)
    throw Error("Guardado " + saved.status);
}
