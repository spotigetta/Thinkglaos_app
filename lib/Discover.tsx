import React, { useState } from "react";
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
export function Discover() {
  return (
    <section className="discover">
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
      <Phrase />
    </section>
  );
}
