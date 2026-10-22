import type { Task } from "../types";
export type Member = { id: string; name: string; role: string; note: string };
export type Venue = {
  id: string;
  name: string;
  area: string;
  status: string;
  notes: string;
  source: string;
  url: string;
};
export type Resource = {
  id: string;
  name: string;
  kind: string;
  url: string;
  notes: string;
};
export type EventInfo = {
  id: string;
  name: string;
  city: string;
  date: string;
  start: string;
  end: string;
  venue: string;
  speaker: string;
  capacity: number;
  ticketsURL: string;
  notes: string;
};
export type EventTask = Task & {
  eventId: string;
  due?: string;
  completedSteps?: number[];
  updatedAt?: string;
};
export type State = {
  schemaVersion: 1;
  revision: number;
  updatedAt: string;
  tasks: EventTask[];
  members: Member[];
  venues: Venue[];
  resources: Resource[];
  events: EventInfo[];
  appliedOps: string[];
};
export type Entity = "tasks" | "members" | "venues" | "resources" | "events";
export type Operation = {
  id: string;
  entity: Entity;
  target: string;
  kind: "create" | "patch" | "delete";
  fields: Record<string, unknown>;
  at: string;
  author: string;
};
export type KnowledgeDoc = {
  id: string;
  title: string;
  text: string;
  kind: string;
};
export type Knowledge = {
  documents: KnowledgeDoc[];
  sources: { name: string; sha256: string; bytes: number }[];
  note: string;
};
export const entities: Entity[] = [
  "tasks",
  "members",
  "venues",
  "resources",
  "events",
];
export const emptyState: State = {
  schemaVersion: 1,
  revision: 0,
  updatedAt: "",
  tasks: [],
  members: [],
  venues: [],
  resources: [],
  events: [],
  appliedOps: [],
};
export function validState(value: unknown): value is State {
  if (!value || typeof value !== "object") return false;
  const s = value as State;
  return (
    s.schemaVersion === 1 &&
    Number.isFinite(s.revision) &&
    entities.every(
      (key) =>
        Array.isArray(s[key]) &&
        s[key].every((row) => row && typeof row.id === "string"),
    ) &&
    Array.isArray(s.appliedOps)
  );
}
export function applyOperations(source: State, ops: Operation[]): State {
  if (!validState(source))
    throw Error(
      "El archivo de datos tiene un formato incompatible. No se ha modificado.",
    );
  const state = structuredClone(source),
    applied = new Set(state.appliedOps);
  for (const op of ops) {
    if (applied.has(op.id)) continue;
    if (
      !entities.includes(op.entity) ||
      !op.target ||
      !["create", "patch", "delete"].includes(op.kind)
    )
      throw Error("Operación no válida");
    const rows = state[op.entity] as unknown as Record<string, unknown>[],
      index = rows.findIndex((row) => row.id === op.target);
    const fields = Object.fromEntries(
      Object.entries(op.fields).filter(
        ([key]) =>
          !["id", "__proto__", "prototype", "constructor"].includes(key),
      ),
    );
    if (op.kind === "delete") {
      if (index >= 0) rows.splice(index, 1);
    } else if (op.kind === "create") {
      if (index < 0) rows.push({ ...fields, id: op.target });
    } else if (index >= 0) Object.assign(rows[index], fields);
    // A patch of a deleted record never resurrects it.
    applied.add(op.id);
    state.revision++;
    state.updatedAt = op.at;
  }
  state.appliedOps = [...applied];
  return state;
}
export const plain = (text: string) =>
  String(text || "")
    .replace(/<br\s*\/?>/gi, " · ")
    .replace(/<[^>]*>/g, "")
    .replace(/\*\*/g, "");
export const normalize = (text: string) =>
  text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
export function findKnowledge(
  question: string,
  state: State,
  docs: KnowledgeDoc[],
  eventId?: string,
) {
  const words = normalize(question)
      .split(/\W+/)
      .filter((word) => word.length > 2),
    rows = [
      ...state.tasks
        .filter((t) => !eventId || t.eventId === eventId)
        .map((t) => ({
          title: t.title,
          text: [
            t.phase,
            t.assignedTo,
            t.isDone ? "Hecha" : "Pendiente",
            t.due || "Sin fecha",
            ...t.notes,
          ].join("\n"),
          kind: "Tarea actual",
        })),
      ...state.events
        .filter((e) => !eventId || e.id === eventId)
        .map((e) => ({
          title: e.name,
          text: JSON.stringify(e),
          kind: "Evento actual",
        })),
      ...state.venues.map((v) => ({
        title: v.name,
        text: v.status + "\n" + v.notes,
        kind: "Espacio candidato",
      })),
      ...docs.flatMap((doc) =>
        doc.text
          .split(/\n(?=#{1,3} )/)
          .map((section) => ({
            title: doc.title,
            text: section,
            kind: doc.kind,
          })),
      ),
    ];
  return rows
    .map((row) => ({
      ...row,
      score: words.reduce(
        (n, w) =>
          n +
          (normalize(row.title).includes(w) ? 5 : 0) +
          (normalize(row.text).includes(w) ? 1 : 0),
        0,
      ),
    }))
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
}
