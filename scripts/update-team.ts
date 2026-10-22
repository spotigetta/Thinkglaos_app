import fs from "node:fs";
import { execFileSync } from "node:child_process";
import type { State } from "../lib/model";
import { volunteerExplanation } from "../lib/Welcome";
const credential = execFileSync("git", ["credential", "fill"], {
  input: "protocol=https\nhost=github.com\n\n",
  encoding: "utf8",
  stdio: ["pipe", "pipe", "pipe"],
});
const token = credential
  .split(/\r?\n/)
  .find((l) => l.startsWith("password="))
  ?.slice(9);
if (!token) throw Error("Falta credencial Git");
const endpoint =
  "https://api.github.com/repos/spotigetta/Thinkglaos_app/contents/data/state.json";
const headers = {
  Authorization: "Bearer " + token,
  Accept: "application/vnd.github+json",
  "Content-Type": "application/json",
};
const roster = [
  [
    "maria-marcos",
    "Mery Marcos",
    "Voluntaria",
    ["María Marcos", "Mery Marcos"],
  ],
  ["alejandro-zamora", "Alejandro Zamora", "Voluntario", ["Alejandro Zamora"]],
  ["daniel-ramirez", "Daniel Ramírez", "Voluntario", ["Daniel Ramírez"]],
  ["javier-yuste", "Javier Yuste", "Voluntario", ["Javier Yuste"]],
  ["juan-maria", "Juan María", "Voluntario", ["Juan María"]],
  ["lucia-lopez", "Lucía López", "Voluntaria", ["Lucía López"]],
  ["teresa-peteiro", "Teresa", "Voluntaria", ["Teresa Peteiro", "Teresa"]],
  ["pablo-ramirez", "Pablo Ramírez", "Embajador", ["Pablo Ramírez"]],
] as const;
for (let attempt = 0; attempt < 5; attempt++) {
  const response = await fetch(endpoint + "?ref=data&t=" + Date.now(), {
    headers,
  });
  if (!response.ok) throw Error("Lectura " + response.status);
  const file = await response.json();
  const state = JSON.parse(
    Buffer.from(file.content, "base64").toString("utf8"),
  ) as State;
  if (state.schemaVersion !== 1) throw Error("Formato incompatible");
  fs.mkdirSync(".local", { recursive: true });
  fs.writeFileSync(
    ".local/team-before-update.json",
    JSON.stringify(state, null, 2),
  );
  for (const [id, name, role, aliases] of roster) {
    let member = state.members.find(
      (m) => m.id === id || (aliases as readonly string[]).includes(m.name),
    );
    if (!member) {
      member = { id, name, role, note: "" };
      state.members.push(member);
    }
    const old = member.name;
    Object.assign(member, { name, role });
    for (const task of state.tasks)
      if (task.assignedTo === old) task.assignedTo = name;
  }
  // Latest team supplied by Pablo replaces the previous list. Keep tasks intact.
  state.members = state.members.filter((m) => m.id !== "helena-palomino");
  const event =
    state.events.find((e) => e.id === "toledo-proxima") || state.events[0];
  const guide = {
    id: "guia-voluntarios",
    name: "Guía rápida para voluntarios",
    kind: "Organización",
    url: "",
    notes: volunteerExplanation(state, event.id),
  };
  const resource = state.resources.find((r) => r.id === guide.id);
  if (resource) Object.assign(resource, guide);
  else state.resources.push(guide);
  const audio = {
    id: "audio-manolo-whatsapp",
    name: "Audio de Manolo · WhatsApp",
    kind: "Audio",
    url: "https://spotigetta.github.io/Thinkglaos_app/media/audio-manolo-whatsapp.mp3",
    notes:
      "MP3 extraído del vídeo original. Reproduce, descarga o comparte desde la sección Vídeos.",
  };
  const previous = state.resources.find((r) => r.id === audio.id);
  if (previous) Object.assign(previous, audio);
  else state.resources.push(audio);
  state.revision++;
  state.updatedAt = new Date().toISOString();
  const saved = await fetch(endpoint, {
    method: "PUT",
    headers,
    body: JSON.stringify({
      branch: "data",
      sha: file.sha,
      message:
        "Actualizar voluntarios, coordinación de Pablo y audio compartible",
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
      "Equipo actualizado: 7 voluntarios y Pablo, embajador. Tareas conservadas.",
    );
    break;
  }
  if (![409, 422].includes(saved.status) || attempt === 4)
    throw Error("Guardado " + saved.status);
}
