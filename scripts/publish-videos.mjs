import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
const REPO = "spotigetta/Thinkglaos_app",
  TAG = "videos-originales-2026-10",
  API = "https://api.github.com/repos/" + REPO;
const credential = execFileSync("git", ["credential", "fill"], {
  input: "protocol=https\nhost=github.com\n\n",
  encoding: "utf8",
  stdio: ["pipe", "pipe", "pipe"],
});
const token = credential
  .split(/\r?\n/)
  .find((line) => line.startsWith("password="))
  ?.slice(9);
if (!token) throw Error("Falta la credencial del gestor Git");
const headers = {
  Authorization: "Bearer " + token,
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
};
async function api(endpoint, method = "GET", body) {
  const response = await fetch(API + endpoint, {
    method,
    headers: { ...headers, "Content-Type": "application/json" },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = Error(
      "GitHub " + response.status + ": " + (result.message || ""),
    );
    error.status = response.status;
    throw error;
  }
  return result;
}
async function sha256(file) {
  const hash = crypto.createHash("sha256");
  for await (const chunk of fs.createReadStream(file)) hash.update(chunk);
  return hash.digest("hex");
}
const groups = [
  ["Videos para sesion", "Vídeo de sesión"],
  ["Videos promocionales", "Vídeo promocional"],
];
const files = groups.flatMap(([folder, kind]) =>
  fs
    .readdirSync(path.resolve("..", folder))
    .filter((name) => /\.mp4$/i.test(name))
    .map((name) => ({
      file: path.resolve("..", folder, name),
      originalName: name,
      kind,
      name: name
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9.-]+/g, "-"),
    })),
);
let release;
try {
  release = await api("/releases/tags/" + TAG);
} catch (error) {
  if (error.status !== 404) throw error;
  release = await api("/releases", "POST", {
    tag_name: TAG,
    target_commitish: "main",
    name: "Vídeos originales · Thinkglaos Toledo",
    body: "Material de sesión y promoción en su calidad original. Archivos subidos sin recomprimir ni convertir. El manifiesto media/videos.json del repositorio incluye tamaño y huella SHA-256.",
    draft: false,
    prerelease: false,
    make_latest: "false",
  });
}
const assets = await api("/releases/" + release.id + "/assets?per_page=100"),
  catalog = [];
for (const item of files) {
  const bytes = fs.statSync(item.file).size,
    hash = await sha256(item.file);
  let asset = assets.find((asset) => asset.name === item.name);
  if (
    asset &&
    (asset.size !== bytes ||
      (asset.digest && asset.digest !== "sha256:" + hash))
  )
    throw Error(
      "Ya existe un archivo diferente con el mismo nombre: " + item.name,
    );
  if (!asset) {
    console.log(
      "Subiendo original: " +
        item.originalName +
        " · " +
        (bytes / 1048576).toFixed(1) +
        " MiB",
    );
    const upload =
      release.upload_url.replace(/\{.*\}$/, "") +
      "?name=" +
      encodeURIComponent(item.name) +
      "&label=" +
      encodeURIComponent(item.originalName);
    const response = await fetch(upload, {
      method: "POST",
      headers: {
        ...headers,
        "Content-Type": "video/mp4",
        "Content-Length": String(bytes),
      },
      body: fs.createReadStream(item.file),
      duplex: "half",
      signal: AbortSignal.timeout(900000),
    });
    asset = await response.json();
    if (!response.ok)
      throw Error(
        "Subida " + response.status + ": " + (asset.message || item.name),
      );
  }
  if (asset.digest) {
    if (asset.digest !== "sha256:" + hash)
      throw Error(
        "La huella de GitHub no coincide con el original: " + item.name,
      );
  } else {
    const response = await fetch(asset.browser_download_url);
    if (!response.ok) throw Error("No se pudo verificar el archivo público");
    const remote = crypto.createHash("sha256");
    for await (const chunk of response.body) remote.update(chunk);
    if (remote.digest("hex") !== hash)
      throw Error("El archivo descargado no coincide con el original");
  }
  const publicResponse = await fetch(asset.browser_download_url, {
    method: "HEAD",
    signal: AbortSignal.timeout(60000),
  });
  if (!publicResponse.ok)
    throw Error("El archivo no está disponible públicamente: " + item.name);
  catalog.push({
    id: "original-video-" + item.name.replace(/\.mp4$/i, ""),
    name: item.originalName.replace(/\.mp4$/i, ""),
    kind: item.kind,
    url: asset.browser_download_url,
    originalFile: item.originalName,
    bytes,
    sha256: hash,
    notes:
      "Archivo original sin recomprimir · " +
      (bytes / 1048576).toFixed(1) +
      " MiB · Disponible en GitHub Releases.",
  });
  console.log("Verificado SHA-256 y enlace público: " + item.originalName);
}
fs.mkdirSync("media", { recursive: true });
fs.writeFileSync(
  "media/videos.json",
  JSON.stringify(
    {
      release: release.html_url,
      quality: "Archivos originales, sin conversión ni recompresión",
      videos: catalog,
    },
    null,
    2,
  ) + "\n",
);
for (let attempt = 0; attempt < 5; attempt++) {
  const file = await api("/contents/data/state.json?ref=data&t=" + Date.now()),
    state = JSON.parse(Buffer.from(file.content, "base64").toString("utf8"));
  if (state.schemaVersion !== 1 || !Array.isArray(state.resources))
    throw Error("Formato de datos incompatible");
  let changed = false;
  for (const video of catalog) {
    const resource = {
        id: video.id,
        name: video.name,
        kind: video.kind,
        url: video.url,
        notes: video.notes,
      },
      index = state.resources.findIndex((row) => row.id === resource.id);
    if (index < 0) {
      state.resources.push(resource);
      changed = true;
    } else if (
      JSON.stringify(state.resources[index]) !== JSON.stringify(resource)
    ) {
      state.resources[index] = { ...state.resources[index], ...resource };
      changed = true;
    }
  }
  if (!changed) {
    console.log("Los vídeos ya estaban enlazados en la aplicación");
    break;
  }
  state.revision++;
  state.updatedAt = new Date().toISOString();
  try {
    await api("/contents/data/state.json", "PUT", {
      branch: "data",
      sha: file.sha,
      message: "Compartir vídeos originales de Thinkglaos en la aplicación",
      content: Buffer.from(JSON.stringify(state, null, 2) + "\n").toString(
        "base64",
      ),
    });
    console.log(
      "Cinco vídeos incorporados a Manual y material sin redesplegar Pages",
    );
    break;
  } catch (error) {
    if (![409, 422].includes(error.status) || attempt === 4) throw error;
  }
}
console.log("Release: " + release.html_url);
