import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  applyOperations,
  emptyState,
  type State,
  type Operation,
  findKnowledge,
} from "../lib/model";
import { Phase } from "../types";
import { SyncEngine, HttpError } from "../lib/github";
const seed = (): State => ({
  ...structuredClone(emptyState),
  events: [
    {
      id: "e",
      name: "Prueba",
      city: "Toledo",
      date: "",
      start: "20:00",
      end: "23:00",
      venue: "",
      speaker: "",
      capacity: 80,
      ticketsURL: "",
      notes: "",
    },
  ],
  tasks: [
    {
      id: "t",
      eventId: "e",
      title: "Original",
      isDone: false,
      phase: Phase.DURING,
      assignedTo: "Embajador",
      originalRole: "Embajador",
      notes: ["Escanear QR"],
    },
  ],
});
const op = (
  id: string,
  fields: Record<string, unknown>,
  kind: Operation["kind"] = "patch",
): Operation => ({
  id,
  entity: "tasks",
  target: "t",
  fields,
  kind,
  at: "2026-10-22T12:00:00Z",
  author: "test",
});
test("Ediciones simultáneas de campos distintos conservan ambos cambios", () => {
  const fromMobile = applyOperations(seed(), [op("1", { isDone: true })]);
  const merged = applyOperations(fromMobile, [op("2", { assignedTo: "QR" })]);
  assert.equal(merged.tasks[0].isDone, true);
  assert.equal(merged.tasks[0].assignedTo, "QR");
});
test("Reintentar la misma operación no duplica ni cambia la revisión", () => {
  const first = applyOperations(seed(), [op("1", { isDone: true })]);
  assert.deepEqual(applyOperations(first, [op("1", { isDone: true })]), first);
});
test("Una edición antigua no resucita una tarjeta borrada", () => {
  const deleted = applyOperations(seed(), [op("1", {}, "delete")]);
  assert.equal(
    applyOperations(deleted, [op("2", { title: "Obsoleta" })]).tasks.length,
    0,
  );
});
test("Crear y borrar no modifica otras tarjetas", () => {
  const state = applyOperations(seed(), [
    {
      ...op("1", { title: "Nueva", notes: [], isDone: false }),
      target: "n",
      kind: "create",
    },
    op("2", {}, "delete"),
  ]);
  assert.equal(state.tasks.length, 1);
  assert.equal(state.tasks[0].id, "n");
});
test("Datos de otra versión se rechazan antes de escribir", () =>
  assert.throws(() =>
    applyOperations({ schemaVersion: 99 } as unknown as State, [op("1", {})]),
  ));
test("Voluntarios y cuentas sin token no pueden encolar cambios", () => {
  const engine = new SyncEngine(
    () => {},
    () => {},
  );
  engine.state = seed();
  assert.throws(() => engine.change(op("1", { isDone: true })));
  engine.identity = { login: "reader", canEdit: false };
  engine.token = "test";
  assert.throws(() => engine.change(op("1", {})));
  assert.equal(engine.pending.length, 0);
});
test("El buscador entiende tildes e incluye instrucciones del tablero", () => {
  const results = findKnowledge("cómo escanear QR", seed(), [], "e");
  assert.equal(results[0].title, "Original");
});
test("Los datos y el manual públicos no incluyen correos, teléfonos ni identificadores fiscales", () => {
  for (const path of [
    "public/data/seed.json",
    "public/data/knowledge.json",
    "constants.ts",
    "components/manualCompleto.txt",
  ]) {
    const text = fs.readFileSync(path, "utf8");
    assert.doesNotMatch(text, /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i, path);
    assert.doesNotMatch(text, /\b[ABCDEFGHJNPQRSUVW]\d{7}[0-9A-J]\b/, path);
    assert.doesNotMatch(
      text,
      /(?<!\d)(?:\+34[ -]?)?[679]\d{2}[ -]?\d{3}[ -]?\d{3}(?!\d)/,
      path,
    );
  }
});
test("Un conflicto SHA se relee y conserva una edición remota", async () => {
  const original = globalThis.fetch;
  let reads = 0,
    writes = 0,
    written: State | undefined;
  const remote = seed();
  globalThis.fetch = async (_url, options) => {
    if (options?.method === "PUT") {
      writes++;
      if (writes === 1) {
        remote.tasks[0].assignedTo = "Cambio del móvil";
        return new Response(JSON.stringify({ message: "Conflict" }), {
          status: 409,
        });
      }
      const body = JSON.parse(String(options.body));
      written = JSON.parse(
        Buffer.from(body.content, "base64").toString("utf8"),
      );
      return new Response("{}", { status: 200 });
    }
    reads++;
    return new Response(
      JSON.stringify({
        content: Buffer.from(JSON.stringify(remote)).toString("base64"),
        sha: "sha-" + reads,
      }),
      { status: 200 },
    );
  };
  try {
    const engine = new SyncEngine(
      () => {},
      () => {},
    );
    engine.state = seed();
    engine.identity = { login: "admin", canEdit: true };
    engine.token = "test";
    engine.pending = [op("1", { isDone: true })];
    await engine.poll();
    assert.equal(writes, 2);
    assert.equal(written?.tasks[0].assignedTo, "Cambio del móvil");
    assert.equal(written?.tasks[0].isDone, true);
    assert.equal(engine.pending.length, 0);
  } finally {
    globalThis.fetch = original;
  }
});
