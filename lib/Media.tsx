import React, { useState } from "react";
import type { Resource } from "./model";
function playOnly(event: React.SyntheticEvent<HTMLMediaElement>) {
  document
    .querySelectorAll<HTMLMediaElement>("video,audio")
    .forEach((media) => {
      if (media !== event.currentTarget) media.pause();
    });
  window.dispatchEvent(new Event("thinkglaos-native-play"));
}
export function mediaKind(url: string) {
  return /\.(mp4|webm|mov)(?:[?#]|$)/i.test(url)
    ? "video"
    : /\.(mp3|m4a|ogg|wav)(?:[?#]|$)/i.test(url)
      ? "audio"
      : null;
}
export function InlineMedia({ resource }: { resource: Resource }) {
  const [error, setError] = useState(false);
  const kind = mediaKind(resource.url);
  const source =
    resource.id === "original-video-Audio-Manolo-Lama-Promo-Thinkglaos"
      ? "./media/manolo-original.mp4"
      : resource.url;
  if (!kind) return null;
  return (
    <div className="inline-media">
      {error ? (
        <p>No se ha podido cargar. Puedes abrir o descargar el original.</p>
      ) : kind === "audio" ? (
        <audio
          controls
          onPlay={playOnly}
          preload="none"
          src={source}
          aria-label={resource.name}
          onError={() => setError(true)}
        />
      ) : (
        <video
          controls
          onPlay={playOnly}
          playsInline
          preload="none"
          src={source}
          aria-label={resource.name}
          onError={() => setError(true)}
        />
      )}
    </div>
  );
}
export function ManoloAudio() {
  const [status, setStatus] = useState("");
  async function share() {
    try {
      setStatus("Preparando audio…");
      const response = await fetch("./media/audio-manolo-whatsapp.mp3");
      if (!response.ok) throw Error("No se pudo descargar el audio");
      const file = new File(
        [await response.blob()],
        "Manolo-Lama-Thinkglaos.mp3",
        { type: "audio/mpeg" },
      );
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: "Manolo Lama · Thinkglaos",
        });
        setStatus("");
      } else {
        const url = URL.createObjectURL(file);
        const link = document.createElement("a");
        link.href = url;
        link.download = file.name;
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 30000);
        setStatus("Descargado. Adjúntalo en WhatsApp como audio.");
      }
    } catch (e) {
      setStatus(
        e instanceof Error && e.name === "AbortError"
          ? ""
          : e instanceof Error
            ? e.message
            : "No se pudo compartir",
      );
    }
  }
  return (
    <section className="manolo-audio">
      <div>
        <small>LISTO PARA WHATSAPP</small>
        <h3>El audio de Manolo</h3>
      </div>
      <audio
        controls
        onPlay={playOnly}
        preload="metadata"
        src="./media/audio-manolo-whatsapp.mp3"
        aria-label="Audio de Manolo Lama"
      />
      <div className="audio-actions">
        <button className="btn primary" onClick={() => void share()}>
          Compartir audio
        </button>
        <a
          className="btn"
          href="./media/audio-manolo-whatsapp.mp3"
          download="Manolo-Lama-Thinkglaos.mp3"
        >
          Descargar MP3
        </a>
      </div>
      {status && <p role="status">{status}</p>}
    </section>
  );
}
