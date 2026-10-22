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
const people = [
  ["alejandro-zamora", "Alejandro Zamora", "Voluntario"],
  ["teresa-peteiro", "Teresa Peteiro", "Voluntaria"],
  ["daniel-ramirez", "Daniel Ramírez", "Voluntario"],
  ["juan-maria", "Juan María", "Voluntario"],
  ["helena-palomino", "Helena Palomino", "Voluntaria"],
  ["maria-marcos", "María Marcos", "Voluntaria"],
  ["pablo-ramirez", "Pablo Ramírez", "Embajador"],
  ["javier-yuste", "Javier Yuste", "Embajador"],
];
for (let attempt = 0; attempt < 5; attempt++) {
  const { state, sha } = await read();
  if (state.schemaVersion !== 1) throw Error("Versión no compatible");
  fs.writeFileSync(
    ".local/project-update-backup.json",
    JSON.stringify(state, null, 2),
  );
  const event =
    state.events.find((e) => e.id === "toledo-proxima") || state.events[0];
  if (!event) throw Error("No existe evento para actualizar");
  Object.assign(event, {
    name: "Thinkglao · Laura Rodríguez Rivero",
    city: "Toledo",
    date: "2026-10-29",
    start: "20:00",
    end: "",
    venue: "Claustro Santo Tomé",
    speaker: "Laura Rodríguez Rivero",
    notes:
      "Jueves 29 de octubre de 2026 a las 20:00. Sede y ponente indicados por Pablo. Hora de finalización por confirmar; el aforo de la ficha es una previsión. Los materiales del Thinkglao anterior los conserva Pablo Ramírez.",
  });
  state.members = state.members.filter(
    (member) =>
      !/^role-\d+$/.test(member.id) ||
      ![
        "Embajador",
        "Voluntario QR",
        "Voluntario Apoyo",
        "Voluntario Logística",
        "Voluntario Contenido",
        "Voluntario 3",
        "Responsable Material",
      ].includes(member.name),
  );
  for (const [id, name, role] of people) {
    const member = state.members.find((m) => m.id === id || m.name === name);
    if (member)
      Object.assign(member, {
        name,
        role,
        note:
          name === "Pablo Ramírez"
            ? "Conserva los materiales del Thinkglao anterior."
            : member.note || "",
      });
    else
      state.members.push({
        id,
        name,
        role,
        note:
          name === "Pablo Ramírez"
            ? "Conserva los materiales del Thinkglao anterior."
            : "",
      });
  }
  const custody = {
      id: "material-custodia-pablo",
      name: "Material del Thinkglao anterior",
      kind: "Organización",
      url: "",
      notes:
        "Los materiales del Thinkglao anterior los conserva Pablo Ramírez. Coordinar con Pablo la recogida y el traslado al próximo encuentro.",
    },
    existing = state.resources.find((r) => r.id === custody.id);
  if (existing) Object.assign(existing, custody);
  else state.resources.push(custody);
  const venue = state.venues.find((v) => v.name === "Claustro Santo Tomé");
  if (venue)
    Object.assign(venue, {
      status: "Confirmado",
      notes:
        "Sede del Thinkglao del 29 de octubre de 2026 a las 20:00 con Laura Rodríguez Rivero.",
    });
  else
    state.venues.push({
      id: "claustro-santo-tome",
      name: "Claustro Santo Tomé",
      area: "Toledo",
      status: "Confirmado",
      notes:
        "Sede del Thinkglao del 29 de octubre de 2026 a las 20:00 con Laura Rodríguez Rivero.",
      source: "Información facilitada por Pablo",
      url: "",
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
      message:
        "Actualizar equipo, encuentro del 29 de octubre y custodia del material",
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
    console.log(
      "Actualizados ocho miembros, evento del 29 de octubre, sede y custodia. Vídeos y tareas existentes conservados.",
    );
    break;
  }
  if (![409, 422].includes(response.status) || attempt === 4)
    throw Error("Guardado " + response.status);
}
