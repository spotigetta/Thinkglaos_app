import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
const root = process.cwd(),
  target = path.resolve(".pages-worktree");
if (!target.startsWith(root + path.sep))
  throw Error("Destino de despliegue no válido");
const git = (args, cwd = root) =>
  execFileSync("git", args, { cwd, stdio: "inherit" });
execFileSync(
  process.platform === "win32" ? "npm.cmd" : "npm",
  ["run", "build"],
  { stdio: "inherit", shell: process.platform === "win32" },
);
if (!fs.existsSync(path.join(target, ".git"))) {
  try {
    git(["show-ref", "--verify", "refs/heads/gh-pages"]);
    git(["worktree", "add", target, "gh-pages"]);
  } catch {
    git(["worktree", "add", "--detach", target]);
    git(["checkout", "--orphan", "gh-pages"], target);
  }
}
git(["rm", "-rf", "--ignore-unmatch", "."], target);
// Only the verified deployment directory is cleaned; the source checkout is untouched.
for (const entry of fs.readdirSync(target))
  if (entry !== ".git")
    fs.rmSync(path.join(target, entry), { recursive: true, force: true });
// Copy explicitly: fs.cpSync can exit silently on some Windows Node builds.
function copyDirectory(source, destination) {
  fs.mkdirSync(destination, { recursive: true });
  for (const item of fs.readdirSync(source, { withFileTypes: true })) {
    const from = path.join(source, item.name), to = path.join(destination, item.name);
    if (item.isDirectory()) copyDirectory(from, to);
    else fs.copyFileSync(from, to);
  }
}
copyDirectory(path.join(root, "dist"), target);
git(["add", "."], target);
try {
  execFileSync("git", ["diff", "--cached", "--quiet"], { cwd: target });
} catch {
  git(["commit", "-m", "Publicar Thinkglaos"], target);
}
console.log(
  "Despliegue preparado en gh-pages. Publicar con git -C .pages-worktree push -u origin gh-pages",
);
