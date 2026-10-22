import React, { useState, useEffect, useRef, type ReactNode } from "react";
import {
  LayoutDashboard,
  GitMerge,
  Users,
  MapPin,
  BookOpen,
  MessageCircle,
  Settings,
  Plus,
  Search,
  ArrowUpRight,
  Check,
  CheckCircle2,
  Clock,
  CalendarDays,
  ChevronRight,
  RefreshCw,
  X,
  LockKeyhole,
  LogOut,
  Trash2,
  Pencil,
  Download,
  Upload,
  Lightbulb,
  Play,
  Pause,
  RotateCcw,
  ExternalLink,
  Paperclip,
  Send,
  ShieldCheck,
  WifiOff,
  FileText,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Phase, Role } from "../types";
import { INITIAL_TASKS } from "../constants";
import {
  emptyState,
  plain,
  normalize,
  type State,
  type Entity,
  type Operation,
  type EventTask,
  type EventInfo,
  type Member,
  type Venue,
  type Resource,
  type Knowledge,
  type KnowledgeDoc,
  findKnowledge,
} from "./model";
import {
  SyncEngine,
  identify,
  request,
  REPO,
  DATA_BRANCH,
  type Identity,
} from "./github";
import { answer } from "./assistant";
import "../index.css";
const CACHE = "thinkglaos-state-v3",
  QUEUE = "thinkglaos-queue-v3",
  AUTH = "thinkglaos-auth-v3";
function read<T>(storage: Storage, key: string, fallback: T): T {
  try {
    return JSON.parse(storage.getItem(key) || "null") || fallback;
  } catch {
    return fallback;
  }
}
const save = (key: string, value: unknown) =>
  localStorage.setItem(key, JSON.stringify(value));
const uid = () => crypto.randomUUID(),
  phases = Object.values(Phase),
  roles = Object.values(Role);
const phaseNames: Record<Phase, string> = {
  [Phase.WEEK_BEFORE]: "Preparar el terreno",
  [Phase.AFTERNOON_BEFORE]: "Montarlo todo",
  [Phase.PRE_EVENT]: "Abrir las puertas",
  [Phase.DURING]: "Vivir el Thinkglao",
  [Phase.POST_EVENT]: "Cerrar el círculo",
};
const dateLabel = (date: string) =>
  date
    ? new Date(date + "T12:00:00").toLocaleDateString("es-ES", {
        day: "numeric",
        month: "short",
      })
    : "Fecha por confirmar";
function Button({
  children,
  onClick,
  kind = "",
  disabled = false,
  title,
}: {
  children: ReactNode;
  onClick?: () => void;
  kind?: string;
  disabled?: boolean;
  title?: string;
}) {
  return (
    <button
      type="button"
      className={"btn " + kind}
      onClick={onClick}
      disabled={disabled}
      title={title}
    >
      {children}
    </button>
  );
}
function Modal({
  title,
  children,
  onClose,
  wide = false,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
    return () => ref.current?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className={wide ? "modal wide" : "modal"}
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      <header>
        <div>
          <small>THINKGLAO · ESPACIO DE TRABAJO</small>
          <h2>{title}</h2>
        </div>
        <Button onClick={onClose} kind="icon" title="Cerrar">
          <X />
        </Button>
      </header>
      <div className="modal-body">{children}</div>
    </dialog>
  );
}
function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}
function SafeLink({
  href,
  children,
  ...props
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  if (!/^https?:\/\//i.test(href)) return <span>{children}</span>;
  return (
    <a href={href} target="_blank" rel="noreferrer" {...props}>
      {children}
    </a>
  );
}
function Empty({ children }: { children: ReactNode }) {
  return (
    <div className="empty">
      <Lightbulb size={30} />
      <p>{children}</p>
    </div>
  );
}
function Timer() {
  const [duration, setDuration] = useState(1080),
    [end, setEnd] = useState<number | null>(null),
    [remaining, setRemaining] = useState(duration);
  useEffect(() => {
    if (!end) return;
    const update = () => {
      const n = Math.max(0, Math.ceil((end - Date.now()) / 1000));
      setRemaining(n);
      if (!n) setEnd(null);
    };
    update();
    const timer = setInterval(update, 250);
    return () => clearInterval(timer);
  }, [end]);
  return (
    <div className={"timer " + (remaining === 0 ? "ended" : "")}>
      <div className="timer-title">
        <Clock size={17} />
        <span>THINKNÓMETRO</span>
        <select
          aria-label="Duración del cronómetro"
          value={duration}
          onChange={(e) => {
            setDuration(+e.target.value);
            setRemaining(+e.target.value);
            setEnd(null);
          }}
        >
          <option value={1080}>Charla · 18 min</option>
          <option value={2700}>Preguntas · 45 min</option>
        </select>
      </div>
      <div className="timer-main">
        <strong>
          {Math.floor(remaining / 60)
            .toString()
            .padStart(2, "0")}
          <i>:</i>
          {(remaining % 60).toString().padStart(2, "0")}
        </strong>
        <div>
          <Button
            kind="icon"
            title={end ? "Pausar" : "Iniciar"}
            onClick={() => setEnd(end ? null : Date.now() + remaining * 1000)}
          >
            {end ? <Pause /> : <Play />}
          </Button>
          <Button
            kind="icon"
            title="Reiniciar cronómetro"
            onClick={() => {
              setEnd(null);
              setRemaining(duration);
            }}
          >
            <RotateCcw size={17} />
          </Button>
        </div>
      </div>
      {remaining === 0 && (
        <p role="status">Tiempo terminado. Abrimos la conversación.</p>
      )}
    </div>
  );
}
export default function Workspace() {
  const [state, setState] = useState<State>(() =>
      read(localStorage, CACHE, emptyState),
    ),
    [status, setStatus] = useState("Conectando…"),
    [error, setError] = useState(""),
    [identity, setIdentity] = useState<Identity | null>(null),
    [view, setView] = useState("board"),
    [eventId, setEventId] = useState(""),
    [phase, setPhase] = useState("ALL"),
    [assignee, setAssignee] = useState("ALL"),
    [pendingOnly, setPendingOnly] = useState(false),
    [query, setQuery] = useState(""),
    [zoom, setZoom] = useState(1),
    [knowledge, setKnowledge] = useState<Knowledge>({
      documents: [],
      sources: [],
      note: "",
    }),
    [modal, setModal] = useState<ReactNode>(null),
    [toast, setToast] = useState(""),
    [legacy, setLegacy] = useState(false);
  const engine = useRef<SyncEngine | null>(null);
  if (!engine.current)
    engine.current = new SyncEngine(
      (next, label, issue) => {
        if (next.events.length) {
          setState(structuredClone(next));
          save(CACHE, next);
        }
        setStatus(label);
        setError(issue || "");
      },
      (owner, operations) => save(QUEUE, { owner, operations }),
    );
  const sync = engine.current;
  useEffect(() => {
    let active = true;
    sync.state = state;
    const stored =
      read<{ token: string } | null>(sessionStorage, AUTH, null) ||
      read<{ token: string } | null>(localStorage, AUTH, null);
    if (stored?.token) {
      sync.token = stored.token;
      identify(stored.token)
        .then((user) => {
          if (!active) return;
          sync.identity = user;
          setIdentity(user);
          const queue = read<{ owner: string; operations: Operation[] }>(
            localStorage,
            QUEUE,
            { owner: "", operations: [] },
          );
          if (queue.owner === user.login && user.canEdit) {
            sync.pending = queue.operations;
            sync.state = read(localStorage, CACHE, emptyState);
          }
          void sync.poll();
        })
        .catch(() => {
          if (active) {
            sync.token = "";
            setError(
              "La conexión de embajador ha caducado. Vuelve a conectar.",
            );
            void sync.poll();
          }
        });
    } else void sync.poll();
    fetch("./data/seed.json")
      .then((r) => r.json())
      .then((seed) => {
        if (active && !sync.state.events.length) {
          sync.state = seed;
          setState(seed);
        }
      })
      .catch(() => {});
    fetch("./data/knowledge.json")
      .then((r) => r.json())
      .then((data) => {
        if (active) setKnowledge(data);
      })
      .catch(() => setError("No se ha podido cargar el manual."));
    const refresh = () => {
        if (document.visibilityState === "visible") void sync.poll();
      },
      timer = setInterval(refresh, 15000);
    window.addEventListener("focus", refresh);
    window.addEventListener("online", refresh);
    document.addEventListener("visibilitychange", refresh);
    setLegacy(!!localStorage.getItem("thinkglao_app_state_v1"));
    return () => {
      active = false;
      clearInterval(timer);
      window.removeEventListener("focus", refresh);
      window.removeEventListener("online", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, []);
  useEffect(() => {
    if (!state.events.find((e) => e.id === eventId))
      setEventId(state.events[0]?.id || "");
  }, [state.events, eventId]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 5000);
    return () => clearTimeout(timer);
  }, [toast]);
  const canEdit = identity?.canEdit === true,
    event = state.events.find((e) => e.id === eventId),
    tasks = state.tasks.filter((t) => t.eventId === eventId),
    done = tasks.filter((t) => t.isDone).length,
    people = [
      ...new Set([
        ...state.members.map((m) => m.name),
        ...roles,
        ...tasks.map((t) => t.assignedTo),
      ]),
    ];
  const filtered = tasks.filter(
    (t) =>
      (phase === "ALL" || t.phase === phase) &&
      (assignee === "ALL" || t.assignedTo === assignee) &&
      (!pendingOnly || !t.isDone) &&
      normalize([t.title, t.assignedTo, ...t.notes].join(" ")).includes(
        normalize(query),
      ),
  );
  const next = tasks.find((t) => t.isImportant && !t.isDone);
  const [collapsed, setCollapsed] = useState<string[]>(() =>
    innerWidth < 760 ? phases.slice(1) : [],
  );
  function change(
    entity: Entity,
    target: string,
    fields: Record<string, unknown>,
    kind: Operation["kind"] = "patch",
  ) {
    try {
      sync.change({
        id: uid(),
        entity,
        target,
        fields,
        kind,
        at: new Date().toISOString(),
        author: identity?.login || "",
      });
    } catch (e) {
      setToast((e as Error).message);
    }
  }
  function remove(entity: Entity, id: string, name: string) {
    setModal(
      <Modal title={"Eliminar " + name} onClose={() => setModal(null)}>
        <p>
          Se eliminará del tablero compartido para todo el equipo. El historial
          de GitHub conservará el cambio.
        </p>
        <div className="form-actions">
          <Button onClick={() => setModal(null)}>Cancelar</Button>
          <Button
            kind="danger"
            onClick={() => {
              change(entity, id, {}, "delete");
              setModal(null);
            }}
          >
            <Trash2 size={16} />
            Eliminar
          </Button>
        </div>
      </Modal>,
    );
  }
  function editTask(task?: EventTask) {
    setModal(
      <TaskEditor
        task={task}
        eventId={eventId}
        people={people}
        onClose={() => setModal(null)}
        onSave={(fields) => {
          change("tasks", task?.id || uid(), fields, task ? "patch" : "create");
          setModal(null);
        }}
      />,
    );
  }
  function detail(task: EventTask) {
    setModal(
      <TaskDetail
        task={task}
        canEdit={canEdit}
        onClose={() => setModal(null)}
        onToggle={() => {
          change("tasks", task.id, { isDone: !task.isDone });
          setModal(null);
        }}
        onEdit={() => editTask(task)}
        onDelete={() => remove("tasks", task.id, task.title)}
        onAsk={() => {
          setModal(null);
          setView("assistant");
          setQuery("Cómo realizar " + task.title);
        }}
        onStep={(index) => {
          const steps = task.completedSteps || [],
            next = steps.includes(index)
              ? steps.filter((i) => i !== index)
              : [...steps, index];
          change("tasks", task.id, { completedSteps: next });
          detail({ ...task, completedSteps: next });
        }}
      />,
    );
  }
  function card(task: EventTask) {
    return (
      <article
        key={task.id}
        className={"task-card " + (task.isDone ? "done" : "")}
      >
        <div className="task-top">
          <span className={"tag " + (task.isImportant ? "critical" : "")}>
            {task.isImportant ? "Clave" : "Operativa"}
          </span>
          {canEdit ? (
            <button
              className={"task-check " + (task.isDone ? "checked" : "")}
              aria-label={
                (task.isDone ? "Reabrir " : "Completar ") + task.title
              }
              aria-pressed={task.isDone}
              onClick={() => change("tasks", task.id, { isDone: !task.isDone })}
            >
              {task.isDone && <Check size={16} />}
            </button>
          ) : task.isDone ? (
            <CheckCircle2 size={19} className="green" />
          ) : (
            <LockKeyhole size={15} className="muted" />
          )}
        </div>
        <button className="task-open" onClick={() => detail(task)}>
          <h3>{task.title}</h3>
          <p>{task.notes[0] || "Instrucciones por añadir."}</p>
        </button>
        <footer>
          <span className="avatar">{task.assignedTo.slice(0, 1)}</span>
          <span className="task-person">{task.assignedTo}</span>
          {task.due && <time>{dateLabel(task.due)}</time>}
          <button
            className="icon-link"
            aria-label={"Ver detalle de " + task.title}
            onClick={() => detail(task)}
          >
            <ArrowUpRight size={18} />
          </button>
        </footer>
      </article>
    );
  }
  function settings() {
    setModal(
      <Connection
        identity={identity}
        status={status}
        onClose={() => setModal(null)}
        onConnect={async (token, remember) => {
          const user = await identify(token),
            queued = read<{ owner: string; operations: Operation[] }>(
              localStorage,
              QUEUE,
              { owner: "", operations: [] },
            );
          if (queued.operations.length && queued.owner !== user.login)
            throw Error(
              "Hay cambios pendientes de otra cuenta. Exporta una copia antes de cambiar de cuenta.",
            );
          sync.token = token;
          sync.identity = user;
          sync.pending = user.canEdit ? queued.operations : [];
          setIdentity(user);
          sessionStorage.removeItem(AUTH);
          localStorage.removeItem(AUTH);
          (remember ? localStorage : sessionStorage).setItem(
            AUTH,
            JSON.stringify({ token, login: user.login }),
          );
          await sync.poll();
          setModal(null);
          setToast(
            user.canEdit
              ? "Conectado como embajador"
              : "Conectado para consultar",
          );
        }}
        onDisconnect={() => {
          if (sync.pending.length) {
            setToast(
              "Quedan cambios por subir. Sincroniza antes de desconectar.",
            );
            return;
          }
          sync.token = "";
          sync.identity = null;
          setIdentity(null);
          sessionStorage.removeItem(AUTH);
          localStorage.removeItem(AUTH);
          setModal(null);
        }}
      />,
    );
  }
  function eventEditor(old?: EventInfo) {
    setModal(
      <EventEditor
        event={old}
        venues={state.venues}
        onClose={() => setModal(null)}
        onSave={(fields) => {
          const id = old?.id || uid();
          change("events", id, fields, old ? "patch" : "create");
          if (!old)
            for (const initial of INITIAL_TASKS) {
              const { id: unused, ...fields } = initial;
              change("tasks", uid(), { ...fields, eventId: id }, "create");
            }
          setEventId(id);
          setModal(null);
        }}
      />,
    );
  }
  function recordEditor(
    entity: "members" | "venues" | "resources",
    record?: Member | Venue | Resource,
  ) {
    setModal(
      <RecordEditor
        entity={entity}
        record={record}
        onClose={() => setModal(null)}
        onSave={(fields) => {
          change(
            entity,
            record?.id || uid(),
            fields,
            record ? "patch" : "create",
          );
          if (entity === "members" && record && fields.name !== record.name)
            for (const task of state.tasks.filter(
              (t) => t.assignedTo === record.name,
            ))
              change("tasks", task.id, { assignedTo: fields.name });
          setModal(null);
        }}
      />,
    );
  }
  async function upload(file: File) {
    if (!canEdit) return;
    if (file.size > 5 * 1024 * 1024) {
      setToast("Máximo 5 MB por archivo. Para vídeos, añade un enlace.");
      return;
    }
    try {
      setToast("Subiendo archivo…");
      const bytes = new Uint8Array(await file.arrayBuffer());
      let raw = "";
      for (const byte of bytes) raw += String.fromCharCode(byte);
      const filename = file.name.replace(/[^a-zA-Z0-9._-]/g, "_"),
        path = "uploads/" + uid() + "-" + filename;
      await request("/contents/" + path, sync.token, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          branch: DATA_BRANCH,
          message: "Añadir material del equipo",
          content: btoa(raw),
        }),
      });
      change(
        "resources",
        uid(),
        {
          name: file.name,
          kind: "Archivo",
          url: `https://raw.githubusercontent.com/${REPO}/${DATA_BRANCH}/${path}`,
          notes: "Compartido por " + identity?.login,
        },
        "create",
      );
      setToast("Archivo compartido");
    } catch (e) {
      setToast((e as Error).message);
    }
  }
  const tabs = [
    ["board", "Plan de trabajo", LayoutDashboard],
    ["workflow", "Flujo", GitMerge],
    ["team", "Equipo", Users],
    ["venues", "Espacios", MapPin],
    ["library", "Manual y material", BookOpen],
    ["assistant", "Preguntas", MessageCircle],
  ] as const;
  return (
    <div className="workspace">
      <aside className="sidebar">
        <a className="brand" href="./">
          <img src="./assets/thinkglao.jpg" alt="Bombilla ITTT" />
          <b>
            THINKGLAOS<span>TOLEDO / ORGANIZACIÓN</span>
          </b>
        </a>
        <div className="sidebar-caption">HAGAMOS QUE PASE</div>
        <nav aria-label="Secciones">
          {tabs.map(([id, name, Icon]) => (
            <button
              key={id}
              className={view === id ? "active" : ""}
              onClick={() => {
                setView(id);
                setQuery("");
              }}
            >
              <Icon size={19} />
              <span>{name}</span>
              {view === id && <ChevronRight size={15} />}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="role-badge">
            <ShieldCheck size={17} />
            <div>
              <b>{canEdit ? "Embajador" : "Voluntario"}</b>
              <small>
                {canEdit ? "Edición del equipo" : "Consulta y preguntas"}
              </small>
            </div>
          </div>
          <button className="settings-link" onClick={settings}>
            <Settings size={17} />
            {identity ? identity.login : "Acceso de embajadores"}
            <ArrowUpRight size={15} />
          </button>
          <img
            className="ittt-wordmark"
            src="./assets/ittt.png"
            alt="It’s time to think"
          />
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumbs">
            <span>Equipo Toledo</span>
            <ChevronRight size={14} />
            <b>{tabs.find((t) => t[0] === view)?.[1]}</b>
          </div>
          <div className="topbar-actions">
            <button
              className={"sync-state " + (error ? "offline" : "")}
              onClick={() => void sync.poll()}
              title={error || "Comprobar cambios del equipo"}
            >
              {error ? <WifiOff size={15} /> : <span className="live-dot" />}
              <span>{status}</span>
              <RefreshCw
                size={13}
                className={status === "Guardando…" ? "spin" : ""}
              />
            </button>
            <button
              className="mobile-settings btn icon"
              onClick={settings}
              aria-label="Conexión y permisos"
            >
              <Settings size={19} />
            </button>
            <span className="profile">
              {identity?.login.slice(0, 1).toUpperCase() || "T"}
            </span>
          </div>
        </header>
        <main>
          <div className="page-heading">
            <div>
              <div className="eyebrow">IT’S TIME TO THINK / TOLEDO</div>
              <h1>
                {view === "board" ? (
                  <>
                    Una buena noche.
                    <br />
                    <em>Un gran equipo.</em>
                  </>
                ) : view === "workflow" ? (
                  <>
                    Cada cosa,<em> a su tiempo.</em>
                  </>
                ) : view === "team" ? (
                  <>
                    Personas que<em> lo hacen posible.</em>
                  </>
                ) : view === "venues" ? (
                  <>
                    Un lugar para<em> pensar juntos.</em>
                  </>
                ) : view === "library" ? (
                  <>
                    Todo lo que<em> hay que saber.</em>
                  </>
                ) : (
                  <>
                    Preguntar es<em> el principio.</em>
                  </>
                )}
              </h1>
              <p>
                {view === "board"
                  ? "Lo importante a mano, para que lo demás fluya."
                  : view === "workflow"
                    ? "Del primer pedido al último abrazo. El recorrido completo."
                    : view === "team"
                      ? "Responsabilidades claras. Una sola versión para todo el equipo."
                      : view === "venues"
                        ? "Candidatos, conversaciones y decisiones, en un mismo lugar."
                        : view === "library"
                          ? "El manual, los recursos y las respuestas de referencia."
                          : "Consulta el manual o traslada una duda al equipo."}
              </p>
            </div>
            <div className="heading-tools">
              <Field label="ESTAMOS PREPARANDO">
                <select
                  aria-label="Evento activo"
                  value={eventId}
                  onChange={(e) => setEventId(e.target.value)}
                >
                  {state.events.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name}
                    </option>
                  ))}
                </select>
              </Field>
              {canEdit && (
                <Button
                  kind="icon"
                  title="Editar evento"
                  onClick={() => eventEditor(event)}
                >
                  <Pencil size={17} />
                </Button>
              )}
            </div>
          </div>
          {error && (
            <div className="connection-alert" role="status">
              <WifiOff size={17} />
              <span>
                {error}.{" "}
                {sync.pending.length
                  ? "Los cambios siguen guardados en este dispositivo."
                  : "Se muestra la última copia disponible."}
              </span>
              <button onClick={() => void sync.poll()}>Reintentar</button>
            </div>
          )}
          {view === "board" && (
            <>
              <section className="event-strip">
                <div className="event-date">
                  <CalendarDays />
                  <div>
                    <small>PRÓXIMO ENCUENTRO</small>
                    <strong>
                      {event?.date ? dateLabel(event.date) : "Pongámosle fecha"}
                    </strong>
                  </div>
                </div>
                <div className="event-location">
                  <MapPin size={17} />
                  <span>{event?.venue || "Espacio por confirmar"}</span>
                  <span className="divider" />
                  <span>
                    {event?.start || "20:00"} — {event?.end || "23:00"}
                  </span>
                </div>
                {event?.ticketsURL ? (
                  <SafeLink href={event.ticketsURL} className="text-link">
                    Entradas <ArrowUpRight size={16} />
                  </SafeLink>
                ) : canEdit ? (
                  <Button onClick={() => eventEditor(event)} kind="quiet">
                    Completar evento <ArrowUpRight size={16} />
                  </Button>
                ) : (
                  <span className="tag">En preparación</span>
                )}
                <Button
                  kind="quiet"
                  onClick={() =>
                    setModal(
                      <Modal
                        title={event?.name || "Encuentro"}
                        onClose={() => setModal(null)}
                      >
                        <dl className="event-facts">
                          {[
                            [
                              "Fecha",
                              event?.date
                                ? dateLabel(event.date)
                                : "Por confirmar",
                            ],
                            [
                              "Horario",
                              (event?.start || "") + " — " + (event?.end || ""),
                            ],
                            ["Espacio", event?.venue || "Por confirmar"],
                            ["Ponente", event?.speaker || "Por confirmar"],
                            ["Aforo previsto", event?.capacity],
                          ].map(([label, value]) => (
                            <React.Fragment key={String(label)}>
                              <dt>{label}</dt>
                              <dd>{value}</dd>
                            </React.Fragment>
                          ))}
                        </dl>
                        <p>{event?.notes}</p>
                      </Modal>,
                    )
                  }
                >
                  Ver encuentro <ArrowUpRight size={14} />
                </Button>
              </section>
              <section className="overview">
                <div className="progress-panel">
                  <div>
                    <span className="eyebrow">VAMOS A POR ELLO</span>
                    <strong>
                      {done}
                      <small> / {tasks.length}</small>
                    </strong>
                    <p>tareas resueltas</p>
                  </div>
                  <div className="progress-side">
                    <span>
                      {tasks.length
                        ? Math.round((done / tasks.length) * 100)
                        : 0}
                      % del camino
                    </span>
                    <div className="progress-track">
                      <i
                        style={{
                          width:
                            (tasks.length ? (done / tasks.length) * 100 : 0) +
                            "%",
                        }}
                      />
                    </div>
                    <small>
                      {tasks.filter((t) => t.isImportant && !t.isDone).length}{" "}
                      tareas clave por resolver
                    </small>
                  </div>
                </div>
                <div className="next-panel">
                  <span className="eyebrow">EL SIGUIENTE PASO</span>
                  {next ? (
                    <button onClick={() => detail(next)}>
                      <b>{next.title}</b>
                      <ArrowUpRight />
                    </button>
                  ) : (
                    <b>Todo lo clave está resuelto.</b>
                  )}
                  <small>{next?.assignedTo || "Buen trabajo, equipo."}</small>
                </div>
                <Timer />
              </section>
            </>
          )}
          {["board", "workflow", "team"].includes(view) && (
            <>
              <div className="section-toolbar">
                <div className="section-title">
                  <h2>
                    {view === "board"
                      ? "El plan de trabajo"
                      : view === "workflow"
                        ? "Las fases del encuentro"
                        : "Reparto del equipo"}
                  </h2>
                  <span>{filtered.length}</span>
                </div>
                <div className="toolbar-actions">
                  {canEdit && (
                    <Button kind="primary" onClick={() => editTask()}>
                      <Plus size={17} />
                      Nueva tarea
                    </Button>
                  )}
                  {view !== "board" && (
                    <div className="zoom-tools">
                      <Button
                        title="Reducir"
                        kind="icon"
                        onClick={() => setZoom(Math.max(0.6, zoom - 0.1))}
                      >
                        <ZoomOut size={16} />
                      </Button>
                      <span>{Math.round(zoom * 100)}%</span>
                      <Button
                        title="Ampliar"
                        kind="icon"
                        onClick={() => setZoom(Math.min(1.2, zoom + 0.1))}
                      >
                        <ZoomIn size={16} />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
              <div className="filters">
                <label className="searchbox">
                  <Search size={17} />
                  <input
                    placeholder="Buscar tarea, instrucción o persona…"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </label>
                <select
                  aria-label="Filtrar por fase"
                  value={phase}
                  onChange={(e) => setPhase(e.target.value)}
                >
                  <option value="ALL">Todas las fases</option>
                  {phases.map((p) => (
                    <option key={p}>{p}</option>
                  ))}
                </select>
                <select
                  aria-label="Filtrar por responsable"
                  value={assignee}
                  onChange={(e) => setAssignee(e.target.value)}
                >
                  <option value="ALL">Todo el equipo</option>
                  {people.map((p) => (
                    <option key={p}>{p}</option>
                  ))}
                </select>
                <label className="filter-toggle">
                  <input
                    type="checkbox"
                    checked={pendingOnly}
                    onChange={(e) => setPendingOnly(e.target.checked)}
                  />
                  Solo pendientes
                </label>
              </div>
            </>
          )}
          {view === "board" && (
            <div className="board">
              {phases.map((p, index) => {
                const list = filtered.filter((t) => t.phase === p);
                return (
                  list.length > 0 && (
                    <section key={p} className="phase-section">
                      <button
                        className="phase-heading"
                        aria-expanded={!collapsed.includes(p)}
                        onClick={() =>
                          setCollapsed((old) =>
                            old.includes(p)
                              ? old.filter((x) => x !== p)
                              : [...old, p],
                          )
                        }
                      >
                        <span className="phase-number">0{index + 1}</span>
                        <div>
                          <small>{p}</small>
                          <h3>{phaseNames[p]}</h3>
                        </div>
                        <div className="phase-line" />
                        <span className="muted">
                          {list.filter((t) => t.isDone).length}/{list.length}
                        </span>
                        <ChevronRight
                          size={15}
                          style={{
                            transform: collapsed.includes(p)
                              ? "none"
                              : "rotate(90deg)",
                          }}
                        />
                      </button>
                      {!collapsed.includes(p) && (
                        <div className="task-grid">{list.map(card)}</div>
                      )}
                    </section>
                  )
                );
              })}
              {!filtered.length && (
                <Empty>No hay tareas con estos filtros.</Empty>
              )}
            </div>
          )}
          {view === "workflow" && (
            <div className="flow-scroll">
              <div className="flow" style={{ zoom }}>
                {phases.map((p, i) => (
                  <section key={p}>
                    <header>
                      <span>0{i + 1}</span>
                      <h2>{phaseNames[p]}</h2>
                      <small>{p}</small>
                    </header>
                    {filtered.filter((t) => t.phase === p).map(card)}
                  </section>
                ))}
              </div>
            </div>
          )}
          {view === "team" && (
            <>
              <div className="team-grid" style={{ zoom }}>
                {people
                  .filter(
                    (person) =>
                      state.members.some((m) => m.name === person) ||
                      tasks.some((t) => t.assignedTo === person),
                  )
                  .map((person) => {
                    const member = state.members.find((m) => m.name === person),
                      list = filtered.filter((t) => t.assignedTo === person);
                    return (
                      <section className="member-panel" key={person}>
                        <header>
                          <span className="member-avatar">
                            {person.slice(0, 1)}
                          </span>
                          <div>
                            <h3>{person}</h3>
                            <small>
                              {member?.role || "Equipo"} ·{" "}
                              {list.filter((t) => !t.isDone).length} pendientes
                            </small>
                          </div>
                          {canEdit && member && (
                            <Button
                              kind="icon"
                              title={"Editar " + person}
                              onClick={() => recordEditor("members", member)}
                            >
                              <Pencil size={15} />
                            </Button>
                          )}
                        </header>
                        {member?.note && <p className="muted">{member.note}</p>}
                        {list.map((t) => (
                          <button
                            className="member-task"
                            key={t.id}
                            onClick={() => detail(t)}
                          >
                            {t.isDone ? (
                              <CheckCircle2 size={16} />
                            ) : (
                              <span className="tiny-circle" />
                            )}
                            <span>
                              {t.title}
                              <small>{t.phase}</small>
                            </span>
                            <ChevronRight size={15} />
                          </button>
                        ))}
                        {!list.length && (
                          <p className="muted">Sin tareas con estos filtros.</p>
                        )}
                        {canEdit && member && (
                          <button
                            className="subtle-danger"
                            onClick={() => remove("members", member.id, person)}
                          >
                            Eliminar del directorio
                          </button>
                        )}
                      </section>
                    );
                  })}
              </div>
              {canEdit && (
                <div className="section-footer">
                  <Button onClick={() => recordEditor("members")}>
                    <Plus size={17} />
                    Añadir persona
                  </Button>
                </div>
              )}
            </>
          )}
          {view === "venues" && (
            <>
              <div className="section-toolbar">
                <p className="muted">
                  Investigación histórica · condiciones pendientes de validar
                </p>
                {canEdit && (
                  <Button kind="primary" onClick={() => recordEditor("venues")}>
                    <Plus size={17} />
                    Nuevo espacio
                  </Button>
                )}
              </div>
              <label className="searchbox standalone">
                <Search size={17} />
                <input
                  placeholder="Buscar espacio o estado…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </label>
              <div className="venue-grid">
                {state.venues
                  .filter((v) =>
                    normalize(v.name + " " + v.status + " " + v.notes).includes(
                      normalize(query),
                    ),
                  )
                  .map((v, i) => (
                    <article className="venue-card" key={v.id}>
                      <div className={"venue-art variant-" + (i % 4)}>
                        <MapPin size={38} />
                        <span>TOLEDO / ESPACIOS</span>
                      </div>
                      <div className="venue-body">
                        <span
                          className={
                            "tag " +
                            (v.status === "Confirmado" ? "success" : "")
                          }
                        >
                          {v.status}
                        </span>
                        <h3>{v.name}</h3>
                        <small>{v.area}</small>
                        <p>{v.notes}</p>
                        <small className="source">
                          Fuente: {v.source || "Equipo local"}
                        </small>
                        <footer>
                          {v.url && (
                            <SafeLink href={v.url}>
                              Ver espacio <ExternalLink size={14} />
                            </SafeLink>
                          )}
                          {canEdit && (
                            <>
                              <Button
                                kind="quiet"
                                onClick={() => recordEditor("venues", v)}
                              >
                                <Pencil size={15} />
                                Editar
                              </Button>
                              <Button
                                kind="icon"
                                title={"Eliminar " + v.name}
                                onClick={() => remove("venues", v.id, v.name)}
                              >
                                <Trash2 size={15} />
                              </Button>
                            </>
                          )}
                        </footer>
                      </div>
                    </article>
                  ))}
              </div>
            </>
          )}
          {view === "library" && (
            <>
              <div className="library-intro">
                <BookOpen size={40} />
                <div>
                  <h2>El conocimiento del equipo</h2>
                  <p>
                    Manual completo y guías de trabajo. Los originales de
                    investigación se conservan en el archivo local.
                  </p>
                </div>
                <span className="tag">
                  {knowledge.sources.length} fuentes revisadas
                </span>
              </div>
              <div className="doc-grid">
                {knowledge.documents.map((doc) => (
                  <button
                    className="doc-card"
                    key={doc.id}
                    onClick={() =>
                      setModal(
                        <Modal
                          title={doc.title}
                          wide
                          onClose={() => setModal(null)}
                        >
                          <div className="markdown">
                            <Markdown remarkPlugins={[remarkGfm]}>
                              {doc.text}
                            </Markdown>
                          </div>
                        </Modal>,
                      )
                    }
                  >
                    <FileText />
                    <small>{doc.kind}</small>
                    <h3>{doc.title}</h3>
                    <ArrowUpRight />
                  </button>
                ))}
              </div>
              <div className="section-toolbar">
                <div className="section-title">
                  <h2>Material compartido</h2>
                  <span>{state.resources.length}</span>
                </div>
                {canEdit && (
                  <div className="toolbar-actions">
                    <label className="btn">
                      <Upload size={16} />
                      Subir archivo
                      <input
                        className="sr-only"
                        type="file"
                        onChange={(e) => {
                          if (e.target.files?.[0])
                            void upload(e.target.files[0]);
                          e.target.value = "";
                        }}
                      />
                    </label>
                    <Button
                      kind="primary"
                      onClick={() => recordEditor("resources")}
                    >
                      <Plus size={17} />
                      Añadir enlace o nota
                    </Button>
                  </div>
                )}
              </div>
              <p className="muted">
                Vídeos, material de sesión, documentos y notas. Los vídeos
                originales siguen en la carpeta local; añade aquí su enlace
                cuando estén alojados.
              </p>
              <div className="resource-list">
                {state.resources.map((r) => (
                  <article key={r.id}>
                    <span className="resource-icon">
                      <Paperclip />
                    </span>
                    <div>
                      <small>{r.kind}</small>
                      <h3>{r.name}</h3>
                      <p>{r.notes}</p>
                    </div>
                    {r.url && (
                      <SafeLink href={r.url} className="btn icon">
                        <ExternalLink size={18} />
                        <span className="sr-only">Abrir {r.name}</span>
                      </SafeLink>
                    )}
                    {canEdit && (
                      <>
                        <Button
                          kind="icon"
                          title="Editar recurso"
                          onClick={() => recordEditor("resources", r)}
                        >
                          <Pencil size={16} />
                        </Button>
                        <Button
                          kind="icon"
                          title="Eliminar recurso"
                          onClick={() => remove("resources", r.id, r.name)}
                        >
                          <Trash2 size={16} />
                        </Button>
                      </>
                    )}
                  </article>
                ))}
              </div>
              {!state.resources.length && (
                <Empty>
                  El material que comparta el equipo aparecerá aquí.
                </Empty>
              )}
              <details className="source-list">
                <summary>Inventario de las fuentes originales</summary>
                <p>{knowledge.note}</p>
                {knowledge.sources.map((s) => (
                  <div key={s.name}>
                    <FileText size={14} />
                    {s.name}
                    <small>{Math.round(s.bytes / 1024)} KB</small>
                  </div>
                ))}
              </details>
            </>
          )}
          {view === "assistant" && (
            <Assistant
              state={state}
              docs={knowledge.documents}
              eventId={eventId}
              initialQuestion={query}
            />
          )}
          <footer className="page-footer">
            <span>
              HECHO PARA ENCONTRARNOS. <Lightbulb size={13} />
            </span>
            <div>
              <button
                onClick={() => {
                  const blob = new Blob(
                      [
                        JSON.stringify(
                          { state, pending: sync.pending },
                          null,
                          2,
                        ),
                      ],
                      { type: "application/json" },
                    ),
                    a = document.createElement("a");
                  a.href = URL.createObjectURL(blob);
                  a.download = "thinkglaos-copia.json";
                  a.click();
                  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
                }}
              >
                <Download size={14} />
                Exportar copia
              </button>
              {canEdit && (
                <button onClick={() => eventEditor()}>
                  <Plus size={14} />
                  Nuevo evento
                </button>
              )}
              {canEdit && (
                <button
                  onClick={() =>
                    setModal(
                      <Modal
                        title="Restaurar tareas de este evento"
                        onClose={() => setModal(null)}
                      >
                        <p>
                          Se sustituirán las tareas del evento activo por las 24
                          tareas originales del protocolo, todas pendientes. Los
                          demás eventos, las conversaciones, el directorio y los
                          recursos se conservan.
                        </p>
                        <div className="form-actions">
                          <Button onClick={() => setModal(null)}>
                            Cancelar
                          </Button>
                          <Button
                            kind="danger"
                            onClick={() => {
                              for (const task of tasks)
                                change("tasks", task.id, {}, "delete");
                              for (const initial of INITIAL_TASKS) {
                                const { id, ...fields } = initial;
                                change(
                                  "tasks",
                                  uid(),
                                  { ...fields, eventId },
                                  "create",
                                );
                              }
                              setModal(null);
                            }}
                          >
                            Restaurar tareas
                          </Button>
                        </div>
                      </Modal>,
                    )
                  }
                >
                  <RotateCcw size={14} />
                  Restaurar plantilla
                </button>
              )}
              {canEdit && legacy && (
                <button
                  onClick={() => {
                    const old = read<EventTask[]>(
                      localStorage,
                      "thinkglao_app_state_v1",
                      [],
                    );
                    if (
                      !confirm(
                        "¿Añadir las tareas de la versión anterior a este evento? No se sustituirán las actuales.",
                      )
                    )
                      return;
                    for (const task of old)
                      change(
                        "tasks",
                        "legacy-" + task.id,
                        { ...task, eventId },
                        "create",
                      );
                    setLegacy(false);
                    setToast("Tareas anteriores incorporadas");
                  }}
                >
                  Importar versión anterior
                </button>
              )}
            </div>
          </footer>
        </main>
      </div>
      <nav className="mobile-nav" aria-label="Secciones móvil">
        {tabs.map(([id, name, Icon]) => (
          <button
            key={id}
            className={view === id ? "active" : ""}
            onClick={() => {
              setView(id);
              setQuery("");
            }}
          >
            <Icon size={20} />
            <span>
              {id === "board" ? "Plan" : id === "library" ? "Manual" : name}
            </span>
          </button>
        ))}
      </nav>
      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
      {modal}
    </div>
  );
}
function TaskEditor({
  task,
  eventId,
  people,
  onSave,
  onClose,
}: {
  task?: EventTask;
  eventId: string;
  people: string[];
  onSave: (fields: Record<string, unknown>) => void;
  onClose: () => void;
}) {
  const [value, set] = useState({
    title: task?.title || "",
    phase: task?.phase || Phase.WEEK_BEFORE,
    assignedTo: task?.assignedTo || Role.UNASSIGNED,
    notes: task?.notes.join("\n") || "",
    due: task?.due || "",
    isImportant: task?.isImportant || false,
  });
  return (
    <Modal title={task ? "Editar tarea" : "Una nueva tarea"} onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSave({
            ...value,
            title: value.title.trim(),
            notes: value.notes.split("\n").filter(Boolean),
            ...(task && value.notes !== task.notes.join("\n")
              ? { completedSteps: [] }
              : {}),
            ...(task
              ? {}
              : { eventId, isDone: false, originalRole: Role.AMBASSADOR }),
          });
        }}
      >
        <Field label="Qué hay que hacer">
          <input
            autoFocus
            required
            maxLength={160}
            value={value.title}
            onChange={(e) => set({ ...value, title: e.target.value })}
          />
        </Field>
        <div className="form-grid">
          <Field label="Fase">
            <select
              value={value.phase}
              onChange={(e) =>
                set({ ...value, phase: e.target.value as Phase })
              }
            >
              {phases.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
          </Field>
          <Field label="Responsable">
            <select
              value={value.assignedTo}
              onChange={(e) => set({ ...value, assignedTo: e.target.value })}
            >
              {[...new Set([value.assignedTo, ...people])].map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="Fecha límite (opcional)">
          <input
            type="date"
            value={value.due}
            onChange={(e) => set({ ...value, due: e.target.value })}
          />
        </Field>
        <Field label="Instrucciones · una por línea">
          <textarea
            rows={5}
            value={value.notes}
            onChange={(e) => set({ ...value, notes: e.target.value })}
          />
        </Field>
        <label className="filter-toggle">
          <input
            type="checkbox"
            checked={value.isImportant}
            onChange={(e) => set({ ...value, isImportant: e.target.checked })}
          />
          Es una tarea clave
        </label>
        <div className="form-actions">
          <Button onClick={onClose}>Cancelar</Button>
          <button className="btn primary" type="submit">
            <Check size={17} />
            Guardar tarea
          </button>
        </div>
      </form>
    </Modal>
  );
}
function TaskDetail({
  task,
  canEdit,
  onClose,
  onToggle,
  onEdit,
  onDelete,
  onAsk,
  onStep,
}: {
  task: EventTask;
  canEdit: boolean;
  onClose: () => void;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onAsk: () => void;
  onStep: (i: number) => void;
}) {
  return (
    <Modal title={task.title} onClose={onClose}>
      <div className="detail-meta">
        <span className="tag">{task.phase}</span>
        {task.isImportant && <span className="tag critical">Clave</span>}
        <span className={"tag " + (task.isDone ? "success" : "")}>
          {task.isDone ? "Completada" : "Pendiente"}
        </span>
      </div>
      <div className="detail-owner">
        <Users size={17} />
        <b>{task.assignedTo}</b>
        {task.due && <span>Hasta {dateLabel(task.due)}</span>}
      </div>
      <h3>Instrucciones</h3>
      <div className="steps">
        {task.notes.map((note, i) => (
          <label key={i}>
            <input
              type="checkbox"
              disabled={!canEdit}
              checked={(task.completedSteps || []).includes(i)}
              onChange={() => onStep(i)}
            />
            <span>{note}</span>
          </label>
        ))}
      </div>
      <small className="muted">Rol del protocolo: {task.originalRole}</small>
      {task.aiAdvice && (
        <details>
          <summary>Consejo guardado de la versión anterior</summary>
          <p>{plain(task.aiAdvice)}</p>
        </details>
      )}
      <div className="form-actions">
        <Button onClick={onAsk}>
          <Lightbulb size={16} />
          Consultar sobre esta tarea
        </Button>
        {canEdit && (
          <>
            <Button onClick={onEdit}>
              <Pencil size={16} />
              Editar
            </Button>
            <Button kind="primary" onClick={onToggle}>
              <CheckCircle2 size={17} />
              {task.isDone ? "Reabrir" : "Marcar hecha"}
            </Button>
            <Button
              kind="danger icon"
              title="Eliminar tarea"
              onClick={onDelete}
            >
              <Trash2 size={16} />
            </Button>
          </>
        )}
      </div>
    </Modal>
  );
}
function EventEditor({
  event,
  venues,
  onSave,
  onClose,
}: {
  event?: EventInfo;
  venues: Venue[];
  onSave: (fields: Record<string, unknown>) => void;
  onClose: () => void;
}) {
  const [value, set] = useState<EventInfo>(
    event || {
      id: "",
      name: "Nuevo Thinkglao",
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
  );
  return (
    <Modal
      title={event ? "Preparar el encuentro" : "Un nuevo encuentro"}
      onClose={onClose}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const { id, ...fields } = value;
          onSave(fields);
        }}
      >
        <p className="muted">
          Confirma la información que ya habéis acordado. Los campos pueden
          quedar pendientes.
        </p>
        <Field label="Nombre">
          <input
            required
            value={value.name}
            onChange={(e) => set({ ...value, name: e.target.value })}
          />
        </Field>
        <div className="form-grid">
          <Field label="Ciudad">
            <input
              value={value.city}
              onChange={(e) => set({ ...value, city: e.target.value })}
            />
          </Field>
          <Field label="Fecha">
            <input
              type="date"
              value={value.date}
              onChange={(e) => set({ ...value, date: e.target.value })}
            />
          </Field>
          <Field label="Inicio">
            <input
              type="time"
              value={value.start}
              onChange={(e) => set({ ...value, start: e.target.value })}
            />
          </Field>
          <Field label="Fin">
            <input
              type="time"
              value={value.end}
              onChange={(e) => set({ ...value, end: e.target.value })}
            />
          </Field>
        </div>
        <Field label="Espacio confirmado">
          <input
            list="venues"
            value={value.venue}
            onChange={(e) => set({ ...value, venue: e.target.value })}
          />
          <datalist id="venues">
            {venues.map((v) => (
              <option key={v.id}>{v.name}</option>
            ))}
          </datalist>
        </Field>
        <Field label="Ponente">
          <input
            value={value.speaker}
            onChange={(e) => set({ ...value, speaker: e.target.value })}
          />
        </Field>
        <div className="form-grid">
          <Field label="Aforo previsto">
            <input
              type="number"
              min={1}
              max={10000}
              value={value.capacity}
              onChange={(e) => set({ ...value, capacity: +e.target.value })}
            />
          </Field>
          <Field label="Enlace de entradas">
            <input
              type="url"
              value={value.ticketsURL}
              onChange={(e) => set({ ...value, ticketsURL: e.target.value })}
            />
          </Field>
        </div>
        <Field label="Notas compartidas">
          <textarea
            rows={3}
            value={value.notes}
            onChange={(e) => set({ ...value, notes: e.target.value })}
          />
        </Field>
        <p className="muted">
          El tablero es público. No incluyas teléfonos ni datos privados.
        </p>
        <div className="form-actions">
          <Button onClick={onClose}>Cancelar</Button>
          <button className="btn primary">Guardar encuentro</button>
        </div>
      </form>
    </Modal>
  );
}
function RecordEditor({
  entity,
  record,
  onSave,
  onClose,
}: {
  entity: "members" | "venues" | "resources";
  record?: Member | Venue | Resource;
  onSave: (fields: Record<string, unknown>) => void;
  onClose: () => void;
}) {
  const fields =
    entity === "members"
      ? [
          ["name", "Nombre visible"],
          ["role", "Función"],
          ["note", "Notas"],
        ]
      : entity === "venues"
        ? [
            ["name", "Nombre del espacio"],
            ["area", "Zona"],
            ["status", "Estado"],
            ["notes", "Condiciones y siguientes pasos"],
            ["source", "Fuente"],
            ["url", "Enlace"],
          ]
        : [
            ["name", "Título"],
            ["kind", "Tipo de material"],
            ["url", "Enlace (opcional)"],
            ["notes", "Nota o descripción"],
          ];
  const defaults =
    entity === "venues"
      ? { status: "Por validar" }
      : entity === "members"
        ? { role: "Voluntario" }
        : { kind: "Enlace" };
  const [value, set] = useState<Record<string, string>>({
    ...defaults,
    ...record,
  } as Record<string, string>);
  return (
    <Modal
      title={
        (record ? "Editar " : "Añadir ") +
        (entity === "members"
          ? "persona"
          : entity === "venues"
            ? "espacio"
            : "material")
      }
      onClose={onClose}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSave(
            Object.fromEntries(fields.map(([id]) => [id, value[id] || ""])),
          );
        }}
      >
        {fields.map(([id, label]) => (
          <Field key={id} label={label}>
            {["notes", "note"].includes(id) ? (
              <textarea
                rows={4}
                value={value[id] || ""}
                onChange={(e) => set({ ...value, [id]: e.target.value })}
              />
            ) : id === "status" ? (
              <select
                value={value[id]}
                onChange={(e) => set({ ...value, [id]: e.target.value })}
              >
                {[
                  "Por validar",
                  "Contactado",
                  "En conversación",
                  "Visita prevista",
                  "Confirmado",
                  "Descartado",
                ].map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            ) : (
              <input
                required={id === "name"}
                type={id === "url" ? "url" : "text"}
                value={value[id] || ""}
                onChange={(e) => set({ ...value, [id]: e.target.value })}
              />
            )}
          </Field>
        ))}
        <p className="muted">
          Visible por enlace. Evita datos personales y contactos privados.
        </p>
        <div className="form-actions">
          <Button onClick={onClose}>Cancelar</Button>
          <button className="btn primary" type="submit">
            <Check size={17} />
            Guardar
          </button>
        </div>
      </form>
    </Modal>
  );
}
function Connection({
  identity,
  status,
  onConnect,
  onDisconnect,
  onClose,
}: {
  identity: Identity | null;
  status: string;
  onConnect: (token: string, remember: boolean) => Promise<void>;
  onDisconnect: () => void;
  onClose: () => void;
}) {
  const [token, setToken] = useState(""),
    [remember, setRemember] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <Modal title="Acceso del equipo" onClose={onClose}>
      <div className="access-card">
        <ShieldCheck />
        <div>
          <b>
            {identity ? identity.login : "Estás consultando como voluntario"}
          </b>
          <p>
            {identity?.canEdit
              ? "Puedes editar y los cambios se guardan automáticamente en GitHub."
              : "Puedes consultar todo el tablero, el manual y hacer preguntas."}
          </p>
          <small>{status}</small>
        </div>
      </div>
      {identity ? (
        <Button onClick={onDisconnect}>
          <LogOut size={16} />
          Desconectar este dispositivo
        </Button>
      ) : (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError("");
            try {
              await onConnect(token.trim(), remember);
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <h3>Conectar como embajador</h3>
          <p>
            Usa tu propia cuenta de GitHub con acceso de escritura a{" "}
            <b>{REPO}</b> y un token limitado a este repositorio con{" "}
            <b>Contents: read and write</b>. No compartas el token con
            voluntarios.
          </p>
          <Field label="Token personal de GitHub">
            <input
              type="password"
              autoComplete="off"
              required
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="github_pat_…"
            />
          </Field>
          <label className="filter-toggle">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
            />
            Recordar en este dispositivo de confianza
          </label>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <button type="submit" className="btn primary" disabled={busy}>
            <LockKeyhole size={17} />
            {busy ? "Comprobando permisos…" : "Conectar cuenta"}
          </button>
          <p className="muted">
            Sin marcar la casilla, el token se guarda solo durante esta sesión.
            Nunca se publica en el repositorio.
          </p>
          <SafeLink href="https://github.com/settings/personal-access-tokens/new">
            Crear token limitado <ArrowUpRight size={14} />
          </SafeLink>
        </form>
      )}
    </Modal>
  );
}
type Turn = {
  role: string;
  text: string;
  sources?: ReturnType<typeof findKnowledge>;
  ai?: boolean;
};
function Assistant({
  state,
  docs,
  eventId,
  initialQuestion,
}: {
  state: State;
  docs: KnowledgeDoc[];
  eventId: string;
  initialQuestion: string;
}) {
  const [input, setInput] = useState(initialQuestion),
    [history, setHistory] = useState<Turn[]>(() =>
      read(sessionStorage, "thinkglaos-assistant", []),
    ),
    [busy, setBusy] = useState(false),
    [config, setConfig] = useState(false),
    [key, setKey] = useState(
      () => sessionStorage.getItem("thinkglaos-gemini") || "",
    ),
    [model, setModel] = useState(
      () => localStorage.getItem("thinkglaos-model") || "gemini-2.5-flash",
    ),
    [issues, setIssues] = useState<
      {
        id: number;
        title: string;
        html_url: string;
        user: { login: string };
        state: string;
      }[]
    >([]);
  useEffect(() => {
    request("/issues?state=all&per_page=12")
      .then((rows) =>
        setIssues(
          Array.isArray(rows) ? rows.filter((row) => !row.pull_request) : [],
        ),
      )
      .catch(() => {});
  }, []);
  useEffect(() => {
    sessionStorage.setItem("thinkglaos-assistant", JSON.stringify(history));
  }, [history]);
  async function send(question: string) {
    if (!question.trim() || busy) return;
    setBusy(true);
    setInput("");
    setHistory((h) => [...h, { role: "user", text: question }]);
    try {
      const result = await answer(
        question,
        state,
        docs,
        eventId,
        key,
        model,
        history,
      );
      setHistory((h) => [...h, { role: "assistant", ...result }]);
    } catch (e) {
      setHistory((h) => [
        ...h,
        {
          role: "assistant",
          text:
            "No se ha podido completar la consulta: " +
            (e as Error).message +
            ". Puedes buscar referencias sin clave de Gemini.",
        },
      ]);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="assistant-layout">
      <section className="assistant-main">
        <header className="assistant-head">
          <span className="assistant-mark">
            <Lightbulb />
          </span>
          <div>
            <h2>Una mano con el Thinkglao</h2>
            <p>
              {key
                ? "Gemini · contexto del manual y del evento"
                : "Búsqueda de fuentes · funciona sin clave de IA"}
            </p>
          </div>
          <Button
            kind="icon"
            title="Configurar IA"
            onClick={() => setConfig(!config)}
          >
            <Settings size={18} />
          </Button>
        </header>
        {config && (
          <div className="ai-config">
            <Field label="Clave Gemini · solo en esta sesión">
              <input
                type="password"
                autoComplete="off"
                value={key}
                onChange={(e) => {
                  setKey(e.target.value);
                  sessionStorage.setItem("thinkglaos-gemini", e.target.value);
                }}
              />
            </Field>
            <Field label="Modelo de tu proyecto">
              <input
                value={model}
                onChange={(e) => {
                  setModel(e.target.value);
                  localStorage.setItem("thinkglaos-model", e.target.value);
                }}
              />
            </Field>
            <p className="muted">
              Al consultar con IA se envían tu pregunta, el contexto del manual
              y el tablero a Gemini. La clave permanece en tu sesión. Sin clave,
              se buscan referencias locales.
            </p>
          </div>
        )}
        <div className="conversation" aria-live="polite">
          {!history.length && (
            <div className="chat-welcome">
              <span className="eyebrow">
                SIEMPRE ES BUEN MOMENTO PARA PREGUNTAR
              </span>
              <h3>¿Por dónde empezamos?</h3>
              <p>
                Prepara una tarea, repasa un protocolo o busca lo que dice el
                manual.
              </p>
              <div className="suggestions">
                {[
                  "¿Qué tareas clave faltan?",
                  "¿Cómo preparamos las entradas QR?",
                  "¿Qué hay que comprobar del espacio?",
                ].map((q) => (
                  <button key={q} onClick={() => void send(q)}>
                    {q}
                    <ArrowUpRight size={14} />
                  </button>
                ))}
              </div>
            </div>
          )}
          {history.map((m, i) => (
            <article className={"message " + m.role} key={i}>
              <small>
                {m.role === "user"
                  ? "Tú"
                  : m.ai
                    ? "Asistente Gemini"
                    : "Fuentes del equipo"}
              </small>
              <div className="markdown">
                <Markdown remarkPlugins={[remarkGfm]}>{m.text}</Markdown>
              </div>
              {m.sources && m.sources.length > 0 && (
                <details open={!m.ai}>
                  <summary>Fuentes consultadas · {m.sources.length}</summary>
                  {m.sources.map((s, j) => (
                    <div className="answer-source" key={j}>
                      <b>{s.title}</b>
                      <small>{s.kind}</small>
                      {!m.ai && (
                        <div className="markdown">
                          <Markdown>{s.text}</Markdown>
                        </div>
                      )}
                    </div>
                  ))}
                </details>
              )}
            </article>
          ))}
          {busy && (
            <p className="thinking">
              <span className="live-dot" />
              Consultando el contexto…
            </p>
          )}
        </div>
        <form
          className="composer"
          onSubmit={(e) => {
            e.preventDefault();
            void send(input);
          }}
        >
          <textarea
            aria-label="Tu pregunta"
            placeholder="Pregunta sobre organización, el manual o las tareas…"
            rows={2}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send(input);
              }
            }}
          />
          <button
            type="submit"
            className="btn primary icon"
            disabled={busy || !input.trim()}
            aria-label="Enviar pregunta"
          >
            <Send size={19} />
          </button>
        </form>
        <div className="chat-foot">
          <small>
            Consulta las fuentes antes de tomar decisiones. El asistente no
            modifica el tablero.
          </small>
          <button onClick={() => setHistory([])}>Limpiar conversación</button>
        </div>
      </section>
      <aside className="team-questions">
        <span className="eyebrow">HABLEMOS EN EQUIPO</span>
        <h2>Las dudas, compartidas.</h2>
        <p>
          Deja una pregunta para los embajadores. Se guarda como una
          conversación en GitHub y el equipo puede responder.
        </p>
        <SafeLink
          href={`https://github.com/${REPO}/issues/new?title=${encodeURIComponent("[Equipo] ")}&body=${encodeURIComponent("Evento: " + (state.events.find((e) => e.id === eventId)?.name || "Thinkglao") + "\n\nMi pregunta:\n")}`}
          className="btn primary"
        >
          Preguntar al equipo <ArrowUpRight size={17} />
        </SafeLink>
        <small>
          Necesitas tu propia cuenta de GitHub. No requiere permisos para editar
          el tablero.
        </small>
        <div className="issue-list">
          {issues.map((issue) => (
            <SafeLink key={issue.id} href={issue.html_url}>
              <span className={"issue-dot " + issue.state} />
              <div>
                <b>{issue.title}</b>
                <small>
                  {issue.user.login} ·{" "}
                  {issue.state === "open" ? "Abierta" : "Resuelta"}
                </small>
              </div>
              <ArrowUpRight size={14} />
            </SafeLink>
          ))}
        </div>
        <SafeLink
          href={`https://github.com/${REPO}/issues`}
          className="text-link"
        >
          Ver todas las conversaciones <ArrowUpRight size={14} />
        </SafeLink>
      </aside>
    </div>
  );
}
