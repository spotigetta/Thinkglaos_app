import React, { useState } from "react";
import type { Resource } from "./model";
import { ManoloAudio, InlineMedia, mediaKind } from "./Media";
import { QuoteShorts } from "./QuoteShorts";
import { VolunteerVideos } from "./VolunteerVideos";
const base = "https://www.itstimetothink.org";
const events = [
  [
    "Laura Rodríguez Rivero",
    "29 oct · Toledo",
    "thinkglao-con-laura-rodriguez-rivero",
    "dca753_83b6bb650cc64d459c227d6eead0312d~mv2.jpg",
  ],
  [
    "Ricardo Rivero",
    "23 oct · Artilugio Estudio",
    "thinkglao-con-ricardo-rivero",
    "dca753_cb5b34bc9c464588b0a43f8c8a9ce7bd~mv2.jpg",
  ],
  [
    "Dani Andrés",
    "23 oct · Sant Cugat",
    "thinkglao-con-dani-andres",
    "dca753_520a45454f5a4bdf89a30339e70ce3c8~mv2.jpg",
  ],
  [
    "Loles Sala",
    "29 oct · Winederful",
    "thinkglao-con-loles-sala-4",
    "26f61e_e7e52830f9094bbe9717c2a4f07003ab~mv2.png",
  ],
  [
    "David Cerdá",
    "5 nov · Palacio Cobaleda Nicuesa",
    "thinkglao-con-david-cerda-3",
    "26f61e_bb3a13fc911746839646d86895b7d1fb~mv2.png",
  ],
  [
    "Ana Iris Simón",
    "6 nov · Sala Cats",
    "thinkglao-con-ana-iris-simon",
    "dca753_f9d6b5e7d168493aace13791cbe9919c~mv2.jpg",
  ],
  [
    "Carlomagno",
    "6 nov · Librería Letras",
    "thinkglao-con-carlomagno",
    "26f61e_fbfea7035ce849d8aff96cfbf44e52c6~mv2.png",
  ],
];
const phrases = [
  "Una pregunta puede abrir una noche entera.",
  "Ven con curiosidad. Vuelve con comunidad.",
  "Las mejores conversaciones empiezan escuchando.",
  "Una bombilla, muchas ideas.",
  "Hoy montamos algo más que unas mesas.",
  "Tu pequeña tarea hace posible una gran noche.",
  "Menos prisa. Más preguntas.",
  "El buen rollo también se prepara.",
];
export function Phrase() {
  const [index, setIndex] = useState(() =>
    Math.floor(Math.random() * phrases.length),
  );
  return (
    <div className="phrase">
      <span>{phrases[index]}</span>
      <button
        aria-label="Otra frase"
        onClick={() => setIndex((index + 1) % phrases.length)}
      >
        ↻
      </button>
    </div>
  );
}
type YouTubeItem = { id: string; title: string; kind: "shorts" | "videos" };
export function Discover({ resources = [] }: { resources?: Resource[] }) {
  const [catalog, setCatalog] = useState<YouTubeItem[]>([]);
  const [active, setActive] = useState("");
  const [tab, setTab] = useState<"shorts" | "videos" | "quotes" | "material">(
    "shorts",
  );
  const [query, setQuery] = useState("");
  const [visible, setVisible] = useState(36);
  const [checkedAt, setCheckedAt] = useState("");
  const [error, setError] = useState("");
  React.useEffect(() => {
    const pause = () => setActive("");
    window.addEventListener("thinkglaos-native-play", pause);
    return () => window.removeEventListener("thinkglaos-native-play", pause);
  }, []);
  const normal = (s: string) =>
    s
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  const filtered = catalog.filter(
    (item) => item.kind === tab && normal(item.title).includes(normal(query)),
  );
  React.useEffect(() => {
    const controller = new AbortController();
    fetch("./media/youtube.json", { signal: controller.signal })
      .then((r) => {
        if (!r.ok) throw Error();
        return r.json();
      })
      .then((data) => {
        setCatalog(data.items);
        setCheckedAt(data.checkedAt);
      })
      .catch((e) => {
        if (e.name !== "AbortError")
          setError(
            "No se pudo cargar el catálogo. Prueba a abrir de nuevo esta sección.",
          );
      });
    return () => controller.abort();
  }, []);
  return (
    <section className="discover">
      <h2>Ver, escuchar y compartir</h2>
      <VolunteerVideos />
      {tab !== "quotes" && <ManoloAudio />}
      <div className="media-tabs" role="tablist" aria-label="Tipo de vídeo">
        {(
          [
            ["shorts", "Shorts"],
            ["videos", "Charlas completas"],
            ["quotes", "Frases"],
            ["material", "Material del equipo"],
          ] as const
        ).map(([id, name]) => (
          <button
            key={id}
            role="tab"
            aria-selected={tab === id}
            onClick={() => {
              setTab(id);
              setActive("");
              setVisible(36);
              setQuery("");
            }}
          >
            {name}
          </button>
        ))}
      </div>
      {error && <p role="status">{error}</p>}
      {tab === "quotes" ? (
        <QuoteShorts />
      ) : tab !== "material" ? (
        <>
          <div className="catalog-tools">
            <input
              aria-label="Buscar vídeos en todo el canal"
              placeholder="Busca entre todos los vídeos y ponentes…"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setVisible(36);
              }}
            />
            <span>
              {filtered.length}{" "}
              {tab === "shorts" ? "Shorts" : "vídeos completos"} disponibles
            </span>
            {checkedAt && (
              <small>
                Catálogo consultado el{" "}
                {new Date(checkedAt).toLocaleDateString("es-ES")}
              </small>
            )}
          </div>
          <div
            className={"youtube-grid " + (tab === "shorts" ? "is-shorts" : "")}
          >
            {filtered.slice(0, visible).map((item) => (
              <article key={item.id} className="youtube-card">
                <div className="youtube-frame">
                  {active === item.id ? (
                    <iframe
                      title={item.title}
                      src={
                        "https://www.youtube-nocookie.com/embed/" +
                        item.id +
                        "?autoplay=1&playsinline=1&rel=0"
                      }
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                      referrerPolicy="strict-origin-when-cross-origin"
                    />
                  ) : (
                    <button
                      onClick={() => {
                        document
                          .querySelectorAll<HTMLMediaElement>("video,audio")
                          .forEach((media) => media.pause());
                        setActive(item.id);
                      }}
                      aria-label={"Reproducir " + item.title}
                    >
                      <img
                        loading="lazy"
                        src={
                          "https://i.ytimg.com/vi/" + item.id + "/hqdefault.jpg"
                        }
                        alt=""
                      />
                      <span>▶</span>
                    </button>
                  )}
                </div>
                <h3>{item.title}</h3>
                {active === item.id && (
                  <a
                    href={"https://www.youtube.com/watch?v=" + item.id}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Si YouTube bloquea la reproducción, abrir original ↗
                  </a>
                )}
              </article>
            ))}
          </div>
          {visible < filtered.length && (
            <button
              className="btn catalog-more"
              onClick={() => setVisible((n) => n + 36)}
            >
              Cargar más · {Math.min(visible, filtered.length)} de{" "}
              {filtered.length}
            </button>
          )}
          {filtered.length === 0 && <p>No hay vídeos para esa búsqueda.</p>}
        </>
      ) : (
        <div className="team-media">
          {resources
            .filter((r) => mediaKind(r.url))
            .map((r) => (
              <article key={r.id}>
                <h3>{r.name}</h3>
                <InlineMedia resource={r} />
                <a href={r.url} target="_blank" rel="noreferrer">
                  Descargar original ↗
                </a>
              </article>
            ))}
        </div>
      )}
      <details className="event-discovery">
        <summary>Otros encuentros · entradas y lugares</summary>
        <h2>Más Thinkglaos</h2>
        <p>Desliza y descubre ↔</p>
        <div className="shorts-track">
          {events.map(([name, date, slug, img]) => (
            <a
              className="short-card"
              key={slug}
              href={base + "/event-details/" + slug}
              target="_blank"
              rel="noreferrer"
            >
              <img
                loading="lazy"
                src={"https://static.wixstatic.com/media/" + img}
                alt={"Cartel de " + name}
              />
              <div>
                <small>{date}</small>
                <h3>{name}</h3>
                <span>Ver encuentro ↗</span>
              </div>
            </a>
          ))}
        </div>
        <div className="discover-links">
          <a
            className="btn primary"
            href="https://www.youtube.com/@ItsTimeToThink/shorts"
            target="_blank"
            rel="noreferrer"
          >
            ▶ Shorts
          </a>
          <a
            className="btn"
            href="https://www.youtube.com/@ItsTimeToThink/videos"
            target="_blank"
            rel="noreferrer"
          >
            Vídeos completos ↗
          </a>
          <a
            className="btn"
            href={base + "/thinkglaos"}
            target="_blank"
            rel="noreferrer"
          >
            Agenda oficial ↗
          </a>
        </div>
        <small>
          Carteles de la agenda oficial · consulta del 22 oct 2026. Fechas y
          disponibilidad actualizadas en cada enlace.
        </small>
      </details>
      <Phrase />
    </section>
  );
}
