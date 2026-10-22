// Uses the existing Git credential helper; credentials never enter files or output.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
const result = execFileSync("git", ["credential", "fill"], {
  input: "protocol=https\nhost=github.com\n\n",
  encoding: "utf8",
  stdio: ["pipe", "pipe", "pipe"],
});
const token = result
  .split(/\r?\n/)
  .find((line) => line.startsWith("password="))
  ?.slice(9);
if (!token) throw Error("No hay credenciales GitHub disponibles");
const api = async (endpoint, method = "GET", body) => {
  const r = await fetch(
    "https://api.github.com/repos/spotigetta/Thinkglaos_app" + endpoint,
    {
      method,
      headers: {
        Authorization: "Bearer " + token,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    },
  );
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw Error("GitHub " + r.status + " " + (data.message || ""));
  return data;
};
const cmd = process.argv[2] || "status";
if (cmd === "status") {
  const repo = await api("");
  console.log(
    JSON.stringify({
      private: repo.private,
      permissions: repo.permissions,
      has_issues: repo.has_issues,
    }),
  );
  try {
    const pages = await api("/pages");
    console.log(
      JSON.stringify({
        url: pages.html_url,
        status: pages.status,
        source: pages.source,
      }),
    );
  } catch (e) {
    console.log(e.message);
  }
}
if (cmd === "public") {
  await api("", "PATCH", { private: false, has_issues: true });
  console.log("Repositorio público y preguntas habilitadas");
}
if (cmd === "seed") {
  let exists = false;
  try {
    await api("/git/ref/heads/data");
    exists = true;
  } catch (e) {
    if (!e.message.includes("404")) throw e;
  }
  if (!exists) {
    const main = await api("/git/ref/heads/main");
    await api("/git/refs", "POST", {
      ref: "refs/heads/data",
      sha: main.object.sha,
    });
    const content = Buffer.from(
      fs.readFileSync("public/data/seed.json"),
    ).toString("base64");
    await api("/contents/data/state.json", "PUT", {
      branch: "data",
      message: "Inicializar tablero compartido de Thinkglaos",
      content,
    });
    console.log("Rama data inicializada");
  } else console.log("Rama data existente conservada");
}
if (cmd === "pages") {
  try {
    await api("/pages", "POST", {
      source: { branch: "gh-pages", path: "/" },
      build_type: "legacy",
    });
  } catch (e) {
    if (!e.message.includes("409")) throw e;
    await api("/pages", "PUT", {
      source: { branch: "gh-pages", path: "/" },
      build_type: "legacy",
    });
  }
  console.log("Pages configurado desde gh-pages");
}
if (cmd === "build") {
  const build = await api("/pages/builds/latest");
  console.log(
    JSON.stringify({
      status: build.status,
      commit: build.commit,
      error: build.error,
    }),
  );
}
