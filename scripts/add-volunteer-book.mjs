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
if (!token) throw Error("No hay credencial Git");
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
  fs.writeFileSync(
    ".local/before-book-resource.json",
    JSON.stringify(state, null, 2),
  );
  const book = {
    id: "libro-voluntario-salsa",
    kind: "Libro PDF",
    name: "El secreto de la salsa · Libro del voluntario",
    url: "https://spotigetta.github.io/Thinkglaos_app/books/el-secreto-de-la-salsa.pdf",
    notes:
      "Original completo de 81 páginas. Lee dentro de la app desde Inicio → Libro del voluntario. Accesos al ciclo del voluntario (p. 33), cuidado del equipo (p. 40) y roles de la noche (p. 77). La página de lectura se recuerda en este dispositivo.",
  };
  const old = state.resources.find((r) => r.id === book.id);
  if (old) Object.assign(old, book);
  else state.resources.push(book);
  state.revision++;
  state.updatedAt = new Date().toISOString();
  const saved = await fetch(url, {
    method: "PUT",
    headers,
    body: JSON.stringify({
      branch: "data",
      sha: file.sha,
      message: "Incorporar libro completo del voluntario",
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
    console.log("Libro incorporado al material compartido.");
    break;
  }
  if (![409, 422].includes(saved.status) || attempt === 4)
    throw Error("Guardado " + saved.status);
}
