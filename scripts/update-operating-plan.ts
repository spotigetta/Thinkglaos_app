import fs from "node:fs";
import { execFileSync } from "node:child_process";
const credential = execFileSync("git", ["credential", "fill"], {
    input: "protocol=https\nhost=github.com\n\n",
    encoding: "utf8",
    stdio: ["pipe", "pipe", "pipe"],
  }),
  token = credential
    .split(/\r?\n/)
    .find((line) => line.startsWith("password="))
    ?.slice(9);
if (!token) throw Error("No hay credencial Git disponible");
const endpoint =
  "https://api.github.com/repos/spotigetta/Thinkglaos_app/contents/data/state.json";
async function read() {
  const response = await fetch(endpoint + "?ref=data&t=" + Date.now(), {
    headers: {
      Authorization: "Bearer " + token,
      Accept: "application/vnd.github+json",
    },
  });
  if (!response.ok) throw Error("Lectura " + response.status);
  const file = await response.json();
  return {
    sha: file.sha,
    state: JSON.parse(Buffer.from(file.content, "base64").toString("utf8")),
  };
}
import { normalizePhase, planUpdates, extraPlan } from "../lib/plan.ts";
for (let attempt = 0; attempt < 5; attempt++) {
  const { state, sha } = await read();
  fs.mkdirSync(".local", { recursive: true });
  fs.writeFileSync(
    ".local/four-phases-backup.json",
    JSON.stringify(state, null, 2),
  );
  const event = state.events.find((e) => e.id === "toledo-proxima");
  if (!event) throw Error("No se encuentra el evento");
  Object.assign(event, {
    end: "23:30",
    ticketsURL:
      "https://www.itstimetothink.org/event-details/thinkglao-con-laura-rodriguez-rivero",
    notes:
      "Horario oficial: 29 octubre 2026 de 20:00 a 23:30. Claustro Santo Tomé, Pl. del Conde, 4, Toledo. Montaje desde 17:30 y QR listo 19:30: propuesta basada en la experiencia anterior; resto de preparación orientativo. Material anterior con Pablo Ramírez.",
  });
  for (const task of state.tasks) {
    task.phase = normalizePhase(task.phase);
    if (task.eventId !== event.id) continue;
    if (task.id === "manual-005") task.phase = "Esa tarde";
    if (task.id === "manual-021") task.phase = "Fin";
    const update = planUpdates[task.id];
    if (update) {
      if (update.notes) {
        const previous = task.notes || [];
        const done = new Set(
          (task.completedSteps || []).map((i) => previous[i]),
        );
        // Keep earlier instructions in the detail instead of dropping source information.
        const notes = [
          ...update.notes,
          ...previous.filter((n) => !update.notes.includes(n)),
        ];
        Object.assign(task, {
          ...update,
          notes,
          completedSteps: notes.flatMap((n, i) => (done.has(n) ? [i] : [])),
        });
      } else Object.assign(task, update);
    }
    if (!task.time || task.time.includes("?"))
      task.time =
        task.phase === "Organizar"
          ? "Días previos"
          : task.phase === "Esa tarde"
            ? "Antes de las 20:00"
            : task.phase === "Fin"
              ? "Desde 23:30"
              : "20:00–23:30";
  }
  const pizza = state.tasks.find(
    (t) => t.id === "manual-020" && t.eventId === event.id,
  );
  const addedPizza = state.tasks.find((t) => t.id === "operativa-pizzas");
  if (
    pizza &&
    addedPizza &&
    !addedPizza.isDone &&
    addedPizza.assignedTo === "Sin asignar"
  ) {
    pizza.time = "Durante · entrega por confirmar";
    pizza.notes = [...new Set([...pizza.notes, ...addedPizza.notes])];
    state.tasks = state.tasks.filter((t) => t.id !== "operativa-pizzas");
  }
  for (const item of extraPlan.filter((t) => t.id !== "operativa-pizzas"))
    if (!state.tasks.some((t) => t.id === item.id))
      state.tasks.push({
        ...item,
        eventId: event.id,
        assignedTo: "Sin asignar",
        originalRole: "Equipo",
        isDone: false,
      });
  state.revision++;
  state.updatedAt = new Date().toISOString();
  const response = await fetch(endpoint, {
    method: "PUT",
    headers: {
      Authorization: "Bearer " + token,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      branch: "data",
      sha,
      message: "Organizar plan m?vil en cuatro fases y horarios",
      content: Buffer.from(JSON.stringify(state, null, 2) + "\n").toString(
        "base64",
      ),
    }),
  });
  if (response.ok) {
    fs.writeFileSync(
      "public/data/seed.json",
      JSON.stringify(state, null, 2) + "\n",
    );
    console.log("Actualizado el plan de cuatro fases y horarios.");
    break;
  }
  if (![409, 422].includes(response.status) || attempt === 4)
    throw Error("Guardado " + response.status);
}
