import {
  applyOperations,
  validState,
  type State,
  type Operation,
  emptyState,
} from "./model";
export const REPO = "spotigetta/Thinkglaos_app",
  DATA_BRANCH = "data",
  DATA_PATH = "data/state.json";
const API = "https://api.github.com/repos/" + REPO;
export type Identity = { login: string; canEdit: boolean };
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
function b64(text: string) {
  let raw = "";
  for (const byte of new TextEncoder().encode(text))
    raw += String.fromCharCode(byte);
  return btoa(raw);
}
function unb64(text: string) {
  return new TextDecoder().decode(
    Uint8Array.from(atob(text.replace(/\s/g, "")), (c) => c.charCodeAt(0)),
  );
}
export async function request(
  path: string,
  token = "",
  options: RequestInit = {},
) {
  const response = await fetch(
    path.startsWith("https://api.github.com/") ? path : API + path,
    {
      ...options,
      cache: "no-store",
      headers: {
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        ...(token ? { Authorization: "Bearer " + token } : {}),
        ...options.headers,
      },
      signal: AbortSignal.timeout(20000),
    },
  );
  const data = await response.json().catch(() => ({}));
  if (!response.ok)
    throw new HttpError(
      response.status,
      response.status === 401
        ? "Identificación caducada o no válida"
        : response.status === 403
          ? "GitHub ha denegado el acceso o se ha alcanzado el límite de consultas"
          : response.status === 404
            ? "No se encuentra la rama de datos o falta permiso de lectura"
            : data.message || "Error de conexión con GitHub",
    );
  return data;
}
export async function identify(token: string): Promise<Identity> {
  const [user, repo] = await Promise.all([
    request("https://api.github.com/user", token),
    request("", token),
  ]);
  return { login: user.login, canEdit: repo.permissions?.push === true };
}
export async function readState(token = "") {
  const file = await request(
    "/contents/" + DATA_PATH + "?ref=" + DATA_BRANCH + "&t=" + Date.now(),
    token,
  );
  const state = JSON.parse(unb64(file.content || ""));
  if (!validState(state)) throw Error("Datos incompatibles en GitHub");
  return { state: state as State, sha: file.sha as string };
}
export type PersistedQueue = { owner: string; operations: Operation[] };
export class SyncEngine {
  state: State = structuredClone(emptyState);
  pending: Operation[] = [];
  token = "";
  identity: Identity | null = null;
  busy = false;
  private etag = "";
  private rawCache: State | null = null;
  constructor(
    private emit: (state: State, status: string, error?: string) => void,
    private persist: (owner: string, ops: Operation[]) => void,
  ) {}
  async poll() {
    if (this.busy) return;
    this.busy = true;
    let retryDelay = 50;
    try {
      if (this.pending.length) {
        if (!this.token || !this.identity?.canEdit)
          throw Error(
            "Conecta la cuenta del embajador para subir los cambios pendientes",
          );
        for (let attempt = 0; attempt < 5; attempt++) {
          const remote = await readState(this.token),
            batch = this.pending.slice(),
            next = applyOperations(remote.state, batch);
          try {
            await request("/contents/" + DATA_PATH, this.token, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                message: "Actualizar Thinkglao · " + this.identity.login,
                branch: DATA_BRANCH,
                sha: remote.sha,
                content: b64(JSON.stringify(next, null, 2) + "\n"),
              }),
            });
            const ids = new Set(batch.map((op) => op.id));
            this.pending = this.pending.filter((op) => !ids.has(op.id));
            this.state = applyOperations(next, this.pending);
            this.persist(this.identity.login, this.pending);
            this.rawCache = null;
            this.etag = "";
            break;
          } catch (error) {
            if (
              !(error instanceof HttpError) ||
              ![409, 422].includes(error.status) ||
              attempt === 4
            )
              throw error;
          }
        }
      } else if (this.token) {
        this.state = (await readState(this.token)).state;
      } else {
        // Raw reads avoid the anonymous REST limit; a fresh URL bypasses stale CDN copies.
        const response = await fetch(
          `https://raw.githubusercontent.com/${REPO}/${DATA_BRANCH}/${DATA_PATH}?t=${Date.now()}`,
          { cache: "no-store", signal: AbortSignal.timeout(15000) },
        );
        if (response.status === 304 && this.rawCache)
          this.state = this.rawCache;
        else {
          if (!response.ok)
            throw Error(
              "No se puede consultar el tablero compartido (" +
                response.status +
                ")",
            );
          const next = await response.json();
          if (!validState(next)) throw Error("Datos compartidos no válidos");
          this.rawCache = next;
          this.etag = response.headers.get("etag") || "";
          this.state = next;
        }
      }
      this.emit(
        this.state,
        this.pending.length ? "Cambios pendientes" : "Al día",
      );
    } catch (error) {
      retryDelay = 10000;
      this.emit(
        this.state,
        this.pending.length ? "Guardado en este dispositivo" : "Sin conexión",
        error instanceof Error ? error.message : "No se pudo sincronizar",
      );
    } finally {
      this.busy = false;
      if (this.pending.length && this.token && this.identity?.canEdit)
        setTimeout(() => void this.poll(), retryDelay);
    }
  }
  change(op: Operation) {
    if (!this.identity?.canEdit || !this.token)
      throw Error(
        "Solo los embajadores conectados pueden modificar el tablero",
      );
    this.pending.push(op);
    this.persist(this.identity.login, this.pending);
    this.state = applyOperations(this.state, [op]);
    this.emit(this.state, "Guardando…");
    void this.poll();
  }
}
