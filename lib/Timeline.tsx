import React, { useEffect, useRef, useState } from "react";
import type { EventTask, EventInfo } from "./model";
import { madridClock, timelineSlots, markerPosition } from "./event-clock";
export function Timeline({
  tasks,
  event,
  onTask,
}: {
  tasks: EventTask[];
  event?: EventInfo;
  onTask: (task: EventTask) => void;
}) {
  const [now, setNow] = useState(() => new Date());
  const [top, setTop] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const slots = timelineSlots(tasks);
  const clock = madridClock(now);
  const today = clock.date === event?.date;
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    const element = root.current;
    if (!element) return;
    function measure() {
      const base = element!.getBoundingClientRect().top;
      const points = [
        ...element!.querySelectorAll<HTMLElement>("[data-minutes]"),
      ].map((node) => ({
        minutes: Number(node.dataset.minutes),
        top: node.getBoundingClientRect().top - base + 14,
      }));
      setTop(markerPosition(points, clock.minutes));
    }
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [clock.minutes, tasks]);
  return (
    <section className="timeline-view">
      <header className="timeline-clock">
        <div>
          <small>AHORA · MADRID</small>
          <time data-testid="madrid-clock" dateTime={now.toISOString()}>
            {clock.time}
          </time>
        </div>
        <p>
          {today
            ? "Hoy es el encuentro"
            : event?.date && clock.date < event.date
              ? "Próximo encuentro: " +
                new Date(event.date + "T12:00:00").toLocaleDateString("es-ES", {
                  day: "numeric",
                  month: "long",
                })
              : "Plan del encuentro"}
          <span>
            {today
              ? "El punto luminoso avanza con la hora real."
              : "La hora real se muestra arriba; el recorrido corresponde al día del evento."}
          </span>
        </p>
        <button
          onClick={() => {
            const target = today
              ? root.current?.querySelector(".timeline-now")
              : root.current?.querySelector("[data-minutes]");
            target?.scrollIntoView({
              behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
                ? "auto"
                : "smooth",
              block: "center",
            });
          }}
        >
          {today ? "Ir a ahora" : "Ver la tarde"}
        </button>
      </header>
      <div className="branch-timeline" ref={root}>
        {today && slots.some((s) => s.minutes !== null) && (
          <div
            className="timeline-now"
            style={{ top }}
            aria-label={"Ahora " + clock.time}
          >
            <span />
            <b>AHORA {clock.time.slice(0, 5)}</b>
          </div>
        )}
        {slots.map((slot) => (
          <details
            key={slot.key}
            open={slot.minutes !== null}
            className={
              "timeline-slot " +
              (today && slot.minutes !== null && slot.minutes < clock.minutes
                ? "elapsed"
                : "")
            }
          >
            <summary
              className="timeline-hour"
              data-minutes={slot.minutes === null ? undefined : slot.minutes}
            >
              <i />
              <b>{slot.label}</b>
            </summary>
            <div className="timeline-branches">
              {slot.tasks.map((task) => (
                <button
                  key={task.id}
                  className={"timeline-task " + (task.isDone ? "done" : "")}
                  onClick={() => onTask(task)}
                >
                  <span className="branch-status">
                    {task.isDone ? "✓" : "○"}
                  </span>
                  <span>
                    <b>{task.title}</b>
                    <small>
                      {task.assignedTo === "Sin asignar"
                        ? "Por asignar"
                        : task.assignedTo}
                      {task.time ? " · " + task.time : ""}
                      {task.due ? " · " + task.due : ""}
                    </small>
                  </span>
                  <span aria-hidden="true">↗</span>
                </button>
              ))}
            </div>
          </details>
        ))}
        {!tasks.length && (
          <p className="empty">No hay tareas con estos filtros.</p>
        )}
      </div>
    </section>
  );
}
