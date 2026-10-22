import React, { useState } from "react";
import { Copy, Check, Pencil, RotateCcw, MessageCircle } from "lucide-react";
import type { State, Resource } from "./model";
import { whatsappTemplates } from "./communications";
export function Messages({
  state,
  eventId,
  onSave,
}: {
  state: State;
  eventId: string;
  onSave: (resource: Resource, exists: boolean) => void;
}) {
  const templates = whatsappTemplates(state, eventId),
    [active, setActive] = useState(templates[0].id),
    [editing, setEditing] = useState(false),
    [draft, setDraft] = useState(""),
    [notice, setNotice] = useState("");
  const template = templates.find((t) => t.id === active)!,
    id = `whatsapp-${eventId}-${active}`,
    saved = state.resources.find((r) => r.id === id),
    text = saved?.notes || template.text;
  async function copy() {
    try {
      await navigator.clipboard.writeText(editing ? draft : text);
      setNotice("Copiado. Listo para pegar en WhatsApp.");
    } catch {
      setNotice(
        "Selecciona el texto para copiarlo desde el menú de tu dispositivo.",
      );
    }
  }
  return (
    <section className="whatsapp-studio">
      <div className="whatsapp-tabs">
        {templates.map((t) => (
          <button
            key={t.id}
            className={active === t.id ? "active" : ""}
            onClick={() => {
              setActive(t.id);
              setEditing(false);
              setNotice("");
            }}
          >
            <MessageCircle size={18} />
            <span>
              {t.title}
              <small>{t.audience}</small>
            </span>
          </button>
        ))}
      </div>
      <article className="whatsapp-editor">
        <header>
          <div>
            <small>SOLO EMBAJADORES · TEXTOS PARA COPIAR</small>
            <h2>{template.title}</h2>
            <p>
              {saved
                ? "Texto personalizado guardado para este evento."
                : "Borrador generado con los datos actuales del encuentro."}
            </p>
          </div>
        </header>
        <textarea
          aria-label="Texto de WhatsApp"
          rows={17}
          readOnly={!editing}
          value={editing ? draft : text}
          onChange={(e) => setDraft(e.target.value)}
        />
        <div className="form-actions">
          <button className="btn primary" onClick={() => void copy()}>
            <Copy size={17} />
            Copiar para WhatsApp
          </button>
          {editing ? (
            <>
              <button
                className="btn"
                onClick={() => {
                  onSave(
                    {
                      id,
                      name: template.title,
                      kind: "Texto embajadores",
                      url: "",
                      notes: draft,
                    },
                    !!saved,
                  );
                  setEditing(false);
                  setNotice("Guardado para los embajadores del equipo.");
                }}
              >
                <Check size={17} />
                Guardar texto
              </button>
              <button className="btn" onClick={() => setEditing(false)}>
                Cancelar
              </button>
            </>
          ) : (
            <button
              className="btn"
              onClick={() => {
                setDraft(text);
                setEditing(true);
              }}
            >
              <Pencil size={16} />
              Personalizar
            </button>
          )}
          {saved && (
            <button
              className="btn quiet"
              onClick={() => {
                setDraft(template.text);
                setEditing(true);
                setNotice(
                  "Revisa y guarda para sustituir el texto personalizado por el borrador actual.",
                );
              }}
            >
              <RotateCcw size={16} />
              Actualizar con datos del evento
            </button>
          )}
        </div>
        {notice && (
          <p role="status" className="copy-status">
            {notice}
          </p>
        )}
        <p className="muted">
          Revisa el texto antes de enviarlo. Copiar no envía ningún mensaje. Los
          borradores no prometen precios, entradas gratuitas ni condiciones de
          patrocinio.
        </p>
      </article>
    </section>
  );
}
