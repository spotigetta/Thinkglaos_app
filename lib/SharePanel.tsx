import React, { useState } from "react";
import type { EventInfo } from "./model";
export const APP_URL = "https://spotigetta.github.io/Thinkglaos_app/";
export function SharePanel({
  event,
  invitation,
}: {
  event?: EventInfo;
  invitation: string;
}) {
  const [notice, setNotice] = useState("");
  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setNotice("Copiado. Ya puedes pegarlo donde quieras.");
    } catch {
      setNotice("Selecciona y copia el texto de la invitación.");
    }
  }
  async function share(app = false) {
    try {
      if (navigator.share) {
        await navigator.share(
          app
            ? {
                title: "Thinkglaos Toledo · El equipo",
                text: "Nuestro espacio de equipo: tareas, libro, vídeos y próximos encuentros.",
                url: APP_URL,
              }
            : {
                title: event?.name || "Thinkglao Toledo",
                text: event?.ticketsURL
                  ? invitation.replace("\n🎟️ Entradas: " + event.ticketsURL, "")
                  : invitation,
                url: event?.ticketsURL || APP_URL,
              },
        );
        setNotice("");
      } else await copy(app ? APP_URL : invitation);
    } catch (e) {
      if ((e as Error).name !== "AbortError")
        setNotice(
          "Puedes copiar el texto o abrir WhatsApp con los botones de abajo.",
        );
    }
  }
  return (
    <section className="share-panel">
      <p>Comparte con quien quieras. Todos los voluntarios pueden invitar.</p>
      <div className="share-buttons">
        <a
          className="btn primary"
          href={"https://wa.me/?text=" + encodeURIComponent(invitation)}
          target="_blank"
          rel="noreferrer"
        >
          Enviar evento por WhatsApp
        </a>
        <button className="btn" onClick={() => void share()}>
          Compartir evento…
        </button>
        <button className="btn" onClick={() => void copy(invitation)}>
          Copiar invitación
        </button>
      </div>
      <label className="field">
        <span>Invitación del evento</span>
        <textarea
          aria-label="Invitación para compartir"
          readOnly
          rows={8}
          value={invitation}
        />
      </label>
      <div className="share-app">
        <img
          src="./share/thinkglaos-toledo.jpg"
          alt="Miniatura de Thinkglaos Toledo para compartir"
        />
        <h3>Invita también a usar la app</h3>
        <p>El enlace de la aplicación incluye imagen y descripción.</p>
        <div className="share-buttons">
          <button className="btn primary" onClick={() => void share(true)}>
            Compartir app
          </button>
          <button className="btn" onClick={() => void copy(APP_URL)}>
            Copiar enlace de la app
          </button>
        </div>
      </div>
      {notice && <p role="status">{notice}</p>}
    </section>
  );
}
