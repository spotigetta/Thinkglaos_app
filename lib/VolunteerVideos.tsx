import React from "react";
import { InlineMedia } from "./Media";

export const volunteerVideos = [
  {
    id: "voluntarios-salsa",
    name: "El verdadero secreto de la salsa de ITTT",
    url: "./media/voluntarios-secreto-salsa.mp4",
    poster: "./media/voluntarios-secreto-salsa.jpg",
    text: "Tú haces que esto suceda.",
  },
  {
    id: "voluntarios-toledo",
    name: "Prepárate para hacer historia en Toledo",
    url: "./media/voluntarios-historia-toledo.mp4",
    poster: "./media/voluntarios-historia-toledo.jpg",
    text: "Una ciudad. Un equipo. Una noche que recordar.",
  },
];
export function VolunteerVideos() {
  return (
    <section
      className="volunteer-videos"
      aria-label="Vídeos destacados para voluntarios"
    >
      <header>
        <small>PARA NUESTRO EQUIPO</small>
        <h2>La noche empieza contigo.</h2>
      </header>
      <div>
        {volunteerVideos.map((video) => (
          <article key={video.id}>
            <InlineMedia
              resource={{
                ...video,
                kind: "video",
                notes: "Vídeo para voluntarios · original",
              }}
              poster={video.poster}
            />
            <h3>{video.name}</h3>
            <p>{video.text}</p>
            <a href={video.url} download>
              Descargar original ↗
            </a>
          </article>
        ))}
      </div>
    </section>
  );
}
