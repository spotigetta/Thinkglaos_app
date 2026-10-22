import React, { useState } from "react";
import {
  ArrowRight,
  BookOpen,
  Play,
  Users,
  Share2,
  UserPlus,
  MapPin,
} from "lucide-react";
import type { State, EventTask } from "./model";

export function volunteerExplanation(state: State, eventId: string) {
  const event = state.events.find((e) => e.id === eventId);
  const coordinator =
    state.members
      .filter((m) => /embajador/i.test(m.role))
      .map((m) => m.name)
      .join(" y ") || "el embajador";
  return `¡Bienvenido al equipo Thinkglao! 💡\n\nUn Thinkglao es una conversación en comunidad: un ponente comparte una idea durante 18 minutos, después hay unos 45 minutos de preguntas y seguimos charlando con comida y barra libre de cerveza. No hace falta saber del tema: ven con curiosidad.\n\nComo voluntario, tu misión es que la gente y el ponente estén cómodos. Nos repartimos tareas concretas; no tienes que hacerlo todo.\n\n1. Antes: acordamos quién hace cada cosa, compras, material y condiciones del lugar.\n2. Esa tarde: montaje desde las 17:30, pedido al frío, comida, bebidas, música, sonido y señalización. A las 19:30, responsable de QR listo en la puerta con la app. Son horas de trabajo propuestas.\n3. Durante: recibir bien, reponer comida y bebida, cuidar al ponente y estar atentos a las pizzas.\n4. Al terminar: despedida, recogida e inventario.\n\nEn la app elige tu nombre, pulsa «Mis tareas» y abre cada tarjeta para ver los pasos. Si algo falla o no tienes tarea, avisa a ${coordinator}, que coordina el equipo.\n\n${event?.speaker ? `Próximo: ${event.speaker} · ${event.date ? new Date(event.date + "T12:00:00").toLocaleDateString("es-ES", { day: "numeric", month: "long" }) : "fecha por confirmar"} · ${event.start || "hora por confirmar"} · ${event.venue || "lugar por confirmar"}.` : ""}`;
}

export function VolunteerGuide({
  state,
  eventId,
  onBook,
}: {
  state: State;
  eventId: string;
  onBook?: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const text = volunteerExplanation(state, eventId);
  return (
    <section className="volunteer-guide">
      <p className="guide-lead">
        18 minutos de ideas. Preguntas. Comida, cerveza y conversación.
      </p>
      <p>
        Tu misión: ayudar a que el encuentro sea cómodo y cercano. Cada persona
        tiene una parte concreta.
      </p>
      {onBook && (
        <button className="book-invite" onClick={onBook}>
          <BookOpen />
          <span>
            <b>El secreto de la salsa</b>
            <small>Lee el libro del voluntario · 81 páginas</small>
          </span>
          <ArrowRight size={18} />
        </button>
      )}
      <ol>
        {[
          ["Antes", "Acordamos tareas, compras, material y lugar."],
          [
            "17:30 · montaje propuesto",
            "Pedido al frío, preparar comida y bebidas, música, camisetas, sonido y entrada señalizada.",
          ],
          ["19:30 · QR listo", "Responsable en puerta con la app probada."],
          [
            "20:00 · empieza el encuentro",
            "Acoger, reponer comida y bebida, cuidar al ponente y recibir pizzas.",
          ],
          [
            "23:30 · fin oficial",
            "Despedir, recoger, contar el material y acordar quién se lo lleva.",
          ],
        ].map(([title, body]) => (
          <li key={title}>
            <b>{title}</b>
            <span>{body}</span>
          </li>
        ))}
      </ol>
      <p>
        <b>En la app:</b> elige tu nombre → Mis tareas → abre una tarjeta. Las
        marcas de completado las guarda el embajador.
      </p>
      <details>
        <summary>Texto completo para enviar al equipo</summary>
        <p className="guide-message">{text}</p>
      </details>
      <button
        className="btn primary"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
          } catch {
            setCopied(false);
          }
        }}
      >
        {copied ? "Copiado" : "Copiar para WhatsApp"}
      </button>
    </section>
  );
}

export function StartHere({
  state,
  eventId,
  person,
  onPerson,
  onTask,
  onMine,
  onAdd,
  onShare,
  canEdit,
  onGuide,
  onVideos,
  onBook,
  onMontage,
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
  onGuide: () => void;
  onVideos: () => void;
  onBook: () => void;
  onMontage: () => void;
}) {
  const event = state.events.find((e) => e.id === eventId);
  const mine = state.tasks.filter(
    (t) => t.eventId === eventId && t.assignedTo === person && !t.isDone,
  );
  const location = state.venues.find((v) => v.name === event?.venue);
  return (
    <section className="start-here">
      <div className="start-event">
        <span className="start-date">
          {event?.date
            ? new Date(event.date + "T12:00:00").toLocaleDateString("es-ES", {
                weekday: "short",
                day: "numeric",
                month: "short",
              })
            : "Próximo encuentro"}{" "}
          · {event?.start || "Hora pendiente"}
        </span>
        <h1>{event?.speaker || "Nuestro próximo Thinkglao"}</h1>
        <a
          href={
            location?.mapsUrl ||
            "https://www.google.com/maps/search/?api=1&query=" +
              encodeURIComponent(event?.venue + ", " + event?.city)
          }
          target="_blank"
          rel="noreferrer"
        >
          <MapPin size={15} />
          {event?.venue || "Espacio por confirmar"}
        </a>
        <div className="start-utility">
          <button
            className="btn icon"
            title="Compartir encuentro"
            onClick={onShare}
          >
            <Share2 size={17} />
          </button>
          {canEdit && (
            <button
              className="btn icon"
              title="Sumar al equipo"
              onClick={onAdd}
            >
              <UserPlus size={17} />
            </button>
          )}
        </div>
      </div>
      <div className="start-person">
        <label htmlFor="my-team-name">Soy</label>
        <select
          id="my-team-name"
          aria-label="Mi nombre en el equipo"
          value={person}
          onChange={(e) => onPerson(e.target.value)}
        >
          <option value="">Elige tu nombre</option>
          {state.members.map((m) => (
            <option key={m.id}>{m.name}</option>
          ))}
        </select>
      </div>
      <div className="start-actions">
        <button
          className="start-primary"
          onClick={() =>
            person ? onMine() : document.getElementById("my-team-name")?.focus()
          }
        >
          <Users />
          <b>Mis tareas</b>
          <small>
            {person ? `${mine.length} pendientes` : "Elige tu nombre"}
          </small>
          <ArrowRight size={16} />
        </button>
        <button onClick={onGuide}>
          <BookOpen />
          <b>Guía rápida</b>
          <small>Qué hacemos</small>
        </button>
        <button onClick={onVideos}>
          <Play />
          <b>Vídeos</b>
          <small>Ver y compartir</small>
        </button>
      </div>
      <div className="start-tools">
        <button onClick={onBook}>
          <BookOpen size={16} />
          Libro del voluntario
        </button>
        <button onClick={onMontage}>
          <Play size={16} />
          Modo montaje
        </button>
      </div>
      {person && (
        <div className="my-next">
          {mine[0] ? (
            <button onClick={() => onTask(mine[0])}>
              <span>
                <small>Tu siguiente paso</small>
                <b>{mine[0].title}</b>
              </span>
              <ArrowRight size={18} />
            </button>
          ) : (
            <p>
              {state.tasks.some(
                (t) => t.eventId === eventId && t.assignedTo === person,
              )
                ? "Tus tareas están al día."
                : "Aún no tienes tarea asignada. Pregunta a Pablo cómo ayudar."}
            </p>
          )}
        </div>
      )}
      <span className="start-hint">
        El plan del equipo está abajo, en cuatro fases ↓
      </span>
    </section>
  );
}
