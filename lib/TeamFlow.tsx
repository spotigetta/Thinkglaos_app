import React, { useState } from "react";
import {
  UserPlus,
  Search,
  Check,
  ArrowRight,
  Share2,
  Sparkles,
  Users,
  CheckCircle2,
} from "lucide-react";
import { normalize, type State, type EventTask, type Member } from "./model";
import { daysUntil, rosterNames } from "./team-flow";
export function AssignPerson({
  task,
  members,
  tasks,
  onAssign,
  onAdd,
}: {
  task: EventTask;
  members: Member[];
  tasks: EventTask[];
  onAssign: (name: string) => void;
  onAdd: () => void;
}) {
  const [query, setQuery] = useState("");
  return (
    <div className="assignment-picker">
      <p>
        Elige quién se encarga. La persona verá esta tarea en su vista personal.
      </p>
      <label className="searchbox">
        <Search size={17} />
        <input
          autoFocus
          aria-label="Buscar persona para asignar"
          placeholder="Busca en el equipo…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </label>
      <div className="assignment-people">
        {members
          .filter((m) => normalize(m.name).includes(normalize(query)))
          .map((m) => {
            const pending = tasks.filter(
              (t) => !t.isDone && t.assignedTo === m.name,
            ).length;
            return (
              <button
                key={m.id}
                onClick={() => onAssign(m.name)}
                className={task.assignedTo === m.name ? "chosen" : ""}
              >
                <span className="member-avatar">{m.name.slice(0, 1)}</span>
                <span>
                  <b>{m.name}</b>
                  <small>
                    {m.role} ·{" "}
                    {pending
                      ? pending + " pendientes"
                      : "Disponible, sin tareas pendientes"}
                  </small>
                </span>
                {task.assignedTo === m.name ? (
                  <Check size={18} />
                ) : (
                  <ArrowRight size={17} />
                )}
              </button>
            );
          })}
      </div>
      <div className="assignment-bottom">
        <button className="btn" onClick={onAdd}>
          <UserPlus size={17} />
          Añadir persona y asignar
        </button>
        <button className="btn quiet" onClick={() => onAssign("Sin asignar")}>
          Dejar sin asignar
        </button>
      </div>
    </div>
  );
}
export function RosterForm({
  members,
  onSave,
}: {
  members: Member[];
  onSave: (names: string[], role: string, note: string) => void;
}) {
  const [batch, setBatch] = useState(false),
    [text, setText] = useState(""),
    [role, setRole] = useState("Voluntario"),
    [note, setNote] = useState(""),
    [error, setError] = useState(""),
    parsed = rosterNames(text, members);
  return (
    <form
      className="roster-onboarding"
      onSubmit={(e) => {
        e.preventDefault();
        if (!parsed.fresh.length) {
          setError(
            "Escribe un nombre nuevo. Si ya está en el equipo, podrás asignarlo directamente.",
          );
          return;
        }
        if (parsed.fresh.length > 30) {
          setError("Añade hasta 30 personas por tanda.");
          return;
        }
        onSave(parsed.fresh, role, note.trim());
      }}
    >
      <div className="onboarding-intro">
        <span>
          <Users />
        </span>
        <div>
          <h3>Una persona más. Una idea más.</h3>
          <p>Nombre, función y listo. Ya podrá recibir tareas.</p>
        </div>
      </div>
      <div className="roster-mode">
        <button
          type="button"
          className={!batch ? "active" : ""}
          onClick={() => {
            setBatch(false);
            setText("");
          }}
        >
          Una persona
        </button>
        <button
          type="button"
          className={batch ? "active" : ""}
          onClick={() => {
            setBatch(true);
            setText("");
          }}
        >
          Varias de una vez
        </button>
      </div>
      <label className="field">
        <span>{batch ? "Nombres · uno por línea" : "Nombre visible"}</span>
        {batch ? (
          <textarea
            autoFocus
            required
            rows={5}
            maxLength={3000}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={"Ana García\nLuis Pérez"}
          />
        ) : (
          <input
            autoFocus
            required
            maxLength={90}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Nombre y apellidos"
          />
        )}
      </label>
      <fieldset className="role-options">
        <legend>Su función en el equipo</legend>
        {["Voluntario", "Embajador"].map((value) => (
          <label className={role === value ? "active" : ""} key={value}>
            <input
              type="radio"
              name="roster-role"
              value={value}
              checked={role === value}
              onChange={() => setRole(value)}
            />
            {value}
          </label>
        ))}
      </fieldset>
      <details>
        <summary>Añadir una nota (opcional)</summary>
        <label className="field">
          <span>Disponibilidad, material o función concreta</span>
          <textarea
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </label>
      </details>
      {parsed.duplicates.length > 0 && (
        <p className="muted">
          Ya están en el equipo o repetidos: {parsed.duplicates.join(", ")}. Se
          conservarán sin duplicarlos.
        </p>
      )}
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      <p className="muted">
        La función organiza el equipo. El acceso de edición se gestiona por
        separado.
      </p>
      <div className="form-actions">
        <button className="btn primary" type="submit">
          <UserPlus size={17} />
          {batch
            ? "Incorporar " + parsed.fresh.length + " personas"
            : "Añadir al equipo"}
        </button>
      </div>
    </form>
  );
}
export function MissionControl({
  state,
  eventId,
  person,
  onPerson,
  onTask,
  onMine,
  onAdd,
  onShare,
  canEdit,
}: {
  state: State;
  eventId: string;
  person: string;
  onPerson: (name: string) => void;
  onTask: (task: EventTask) => void;
  onMine: () => void;
  onAdd: () => void;
  onShare: () => void;
  canEdit: boolean;
}) {
  const event = state.events.find((e) => e.id === eventId),
    tasks = state.tasks.filter((t) => t.eventId === eventId),
    mine = tasks.filter((t) => t.assignedTo === person),
    open = mine
      .filter((t) => !t.isDone)
      .sort(
        (a, b) =>
          Number(!!b.isImportant) - Number(!!a.isImportant) ||
          (a.due || "9999").localeCompare(b.due || "9999"),
      ),
    unassigned = tasks.filter(
      (t) => !t.isDone && !state.members.some((m) => m.name === t.assignedTo),
    ),
    next = person ? open[0] : tasks.find((t) => !t.isDone && t.isImportant),
    days = daysUntil(event?.date || "");
  return (
    <section className="mission-control">
      <div className="hype-window">
        <div className="window-topline">
          <span className="window-dots">
            <i />
            <i />
            <i />
          </span>
          <span>TOLEDO · LA PRÓXIMA BUENA NOCHE</span>
          <span className="signal-live" />
        </div>
        <div className="hype-body">
          <span className="event-countdown">
            {days === null
              ? "PRÓXIMAMENTE"
              : days < 0
                ? "ASÍ SE CONSTRUYE COMUNIDAD"
                : days === 0
                  ? "ES HOY. VAMOS."
                  : `FALTAN ${days} DÍAS`}
          </span>
          <h2>
            Las buenas ideas
            <br />
            empiezan <em>juntos.</em>
          </h2>
          <p>
            {event?.speaker ? "Con " + event.speaker + ". " : ""}
            {event?.venue || "Un encuentro para pensar y conocernos."}
          </p>
          <div className="hype-facts">
            <span>18’ de ideas</span>
            <span>45’ de conversación</span>
            <span>{state.members.length} en el equipo</span>
          </div>
          <div className="hype-actions">
            <button className="btn hype-share" onClick={onShare}>
              <Share2 size={16} />
              Comparte el Thinkglao
            </button>
            {canEdit && (
              <button className="btn hype-invite" onClick={onAdd}>
                <UserPlus size={16} />
                Sumar al equipo
              </button>
            )}
          </div>
        </div>
        <div className="orbital-art" aria-hidden="true">
          <span />
          <span />
          <span />
          <Sparkles />
        </div>
      </div>
      <div className="personal-window">
        <div className="window-topline">
          <span className="window-dots">
            <i />
            <i />
            <i />
          </span>
          <span>TU PARTE DEL THINKGLAO</span>
        </div>
        <div className="personal-body">
          <label className="field">
            <span>¿Quién eres en el equipo?</span>
            <select
              aria-label="Mi nombre en el equipo"
              value={state.members.some((m) => m.name === person) ? person : ""}
              onChange={(e) => onPerson(e.target.value)}
            >
              <option value="">Elige tu nombre</option>
              {state.members.map((m) => (
                <option key={m.id} value={m.name}>
                  {m.name}
                </option>
              ))}
            </select>
          </label>
          <div className="personal-next" key={person}>
            {person ? (
              <>
                <span className="personal-kicker">
                  {open.length
                    ? `${open.length} ${open.length === 1 ? "tarea pendiente" : "tareas pendientes"}`
                    : "Tu parte está al día"}
                </span>
                <h3>
                  {next
                    ? next.title
                    : mine.length
                      ? "¡Buen trabajo!"
                      : "Aún no tienes tareas asignadas"}
                </h3>
                <p>
                  {next
                    ? next.notes[0]
                    : mine.length
                      ? "Puedes echar una mano con el siguiente paso del equipo."
                      : canEdit
                        ? "Pulsa «Asignar» en una tarjeta para repartir el trabajo."
                        : "Habla con un embajador para concretar cómo puedes ayudar."}
                </p>
              </>
            ) : (
              <>
                <span className="personal-kicker">
                  UN NOMBRE. UN SIGUIENTE PASO.
                </span>
                <h3>
                  {next
                    ? "El siguiente paso del equipo"
                    : "Todo lo clave está listo"}
                </h3>
                <p>{next?.title || "Vamos cerrando los últimos detalles."}</p>
              </>
            )}
          </div>
          <div className="personal-actions">
            {next && (
              <button className="btn primary" onClick={() => onTask(next)}>
                {person ? "Ver qué tengo que hacer" : "Ver el siguiente paso"}
                <ArrowRight size={16} />
              </button>
            )}
            {person && mine.length > 0 && (
              <button className="btn quiet" onClick={onMine}>
                Mis tareas pendientes
              </button>
            )}
          </div>
          {canEdit && unassigned.length > 0 && (
            <div className="assignment-nudge">
              <CheckCircle2 size={15} />
              <span>
                {unassigned.length} tareas todavía sin persona. Puedes
                asignarlas desde cada tarjeta.
              </span>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
