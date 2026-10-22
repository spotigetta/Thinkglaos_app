import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { EventInfo, EventTask } from "./model";
import { madridClock } from "./event-clock";
import { volunteerVideos } from "./VolunteerVideos";
import { montageMusic } from "./montage-music";
type Photo = {
  src: string;
  caption: string;
  source: string;
  credit: string;
  website?: boolean;
  video?: string;
  youtube?: string;
};
const messages = [
  [
    "La noche empieza contigo.",
    "Cada mesa que preparas, cada saludo y cada detalle construyen comunidad.",
  ],
  [
    "Una idea. Muchas preguntas.",
    "Preparamos el lugar para que alguien pueda escuchar de verdad.",
  ],
  [
    "Aquí cabe la curiosidad.",
    "Que se oiga bien, que se esté a gusto y que nadie se quede fuera de la conversación.",
  ],
  [
    "Lo importante pasa entre personas.",
    "Bebida fría, comida lista y ganas de encontrarnos.",
  ],
  [
    "No somos solo un equipo de montaje.",
    "Somos quienes hacemos posible que esta comunidad se encuentre.",
  ],
  [
    "Ya casi se enciende la bombilla.",
    "Micro probado. Entrada señalizada. Equipo preparado.",
  ],
  [
    "Esto continúa fuera de esta sala.",
    "Ciudades, encuentros y personas que se paran a pensar.",
  ],
];
export function Montage({
  event,
  tasks,
  onClose,
}: {
  event?: EventInfo;
  tasks: EventTask[];
  onClose: () => void;
}) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [shorts, setShorts] = useState<{ id: string; title: string }[]>([]);
  const [sound, setSound] = useState(false);
  const synth = useRef<ReturnType<typeof montageMusic> | null>(null);
  const video = useRef<HTMLVideoElement>(null);
  const scenes: Photo[] = [];
  photos.forEach((photo, i) => {
    scenes.push(photo);
    if (i === 1 || i === 3) {
      const clip = volunteerVideos[i === 1 ? 0 : 1];
      scenes.push({
        src: clip.poster,
        caption: clip.name,
        credit: "ITTT · equipo de voluntarios",
        source: clip.url,
        video: clip.url,
      });
    }
    if ((i === 2 || i === 4 || i === 6) && shorts.length) {
      const clip = shorts[Math.floor(i / 2) - 1];
      if (clip)
        scenes.push({
          src: photo.src,
          caption: clip.title,
          credit: "ITTT · canal oficial de YouTube",
          source: "https://www.youtube.com/shorts/" + clip.id,
          youtube: clip.id,
        });
    }
    if (i === 5)
      scenes.push({
        src: photo.src,
        caption: "Manolo Lama · Thinkglaos",
        credit: "ITTT",
        source: "./media/manolo-original.mp4",
        video: "./media/manolo-original.mp4",
      });
  });
  const [index, setIndex] = useState(0);
  const [running, setRunning] = useState(true);
  const [duration, setDuration] = useState(20);
  const [progress, setProgress] = useState(0);
  const [now, setNow] = useState(new Date());
  const [live, setLive] = useState(false);
  const [music, setMusic] = useState<{ url: string; name: string }[]>([]);
  const [track, setTrack] = useState(0);
  const [notice, setNotice] = useState("");
  const elapsed = useRef(0);
  const root = useRef<HTMLDivElement>(null);
  const audio = useRef<HTMLAudioElement>(null);
  const urls = useRef<string[]>([]);
  const ownedFullscreen = useRef(false);
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    fetch("./media/youtube.json")
      .then((r) => r.json())
      .then((data) =>
        setShorts(
          data.items
            .filter((item: { kind: string }) => item.kind === "shorts")
            .slice(0, 3),
        ),
      )
      .catch(() => {});
    fetch("./montage/photos.json")
      .then((r) => {
        if (!r.ok) throw Error();
        return r.json();
      })
      .then((data) => setPhotos(data.photos))
      .catch(() =>
        setNotice("Sin fotos disponibles. El modo montaje sigue activo."),
      );
  }, []);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document
      .querySelectorAll<HTMLMediaElement>("audio,video")
      .forEach((m) => m.pause());
    root.current?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close.current();
      }
      if (e.key === "Tab") {
        const all = [
          ...root.current!.querySelectorAll<HTMLElement>(
            "button,a[href],input,select,audio[controls],iframe",
          ),
        ];
        const first = all[0],
          last = all[all.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", key);
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => {
      document.removeEventListener("keydown", key);
      clearInterval(timer);
      document.body.style.overflow = previousOverflow;
      urls.current.forEach(URL.revokeObjectURL);
      synth.current?.stop();
      if (ownedFullscreen.current && document.fullscreenElement)
        void document.exitFullscreen().catch(() => {});
      previous?.focus();
    };
  }, []);
  useEffect(() => {
    if (!running || live || !scenes.length) return;
    let last = performance.now();
    const timer = setInterval(() => {
      const current = performance.now();
      elapsed.current += current - last;
      last = current;
      if (elapsed.current >= duration * 1000) {
        elapsed.current = 0;
        setIndex((i) => (i + 1) % scenes.length);
      }
      setProgress(elapsed.current / (duration * 1000));
    }, 100);
    return () => clearInterval(timer);
  }, [running, live, duration, scenes.length]);
  useEffect(() => {
    let lock: WakeLockSentinel | undefined;
    let active = true;
    const acquire = async () => {
      try {
        if (document.visibilityState === "visible" && navigator.wakeLock) {
          const next = await navigator.wakeLock.request("screen");
          if (active) lock = next;
          else await next.release();
        }
      } catch {}
    };
    void acquire();
    document.addEventListener("visibilitychange", acquire);
    return () => {
      active = false;
      document.removeEventListener("visibilitychange", acquire);
      void lock?.release();
    };
  }, []);
  function change(offset: number) {
    elapsed.current = 0;
    setProgress(0);
    setLive(false);
    setIndex((i) => (i + offset + scenes.length) % Math.max(scenes.length, 1));
  }
  async function fullscreen() {
    try {
      if (!document.fullscreenElement) {
        await root.current?.requestFullscreen();
        ownedFullscreen.current = true;
      } else await document.exitFullscreen();
    } catch {
      setNotice(
        "El navegador mantiene la vista amplia. Puedes girar el móvil para proyectar.",
      );
    }
  }
  const photo = scenes[index];
  const message = messages[index % messages.length];
  useEffect(() => {
    synth.current?.volume(
      running && !live ? (photo?.video && sound ? 0.035 : 0.18) : 0,
    );
    if (video.current) {
      if (running && !live)
        void video.current
          .play()
          .catch(() =>
            setNotice("Pulsa reproducir en el vídeo para continuar."),
          );
      else video.current.pause();
    }
  }, [running, live, index, sound, photo?.video]);
  return createPortal(
    <div
      className="montage-screen"
      role="dialog"
      aria-modal="true"
      aria-label="Modo montaje Thinkglao"
      ref={root}
      tabIndex={-1}
    >
      <div className="montage-backdrop" key={photo?.src || "initial"}>
        {photo && <img src={photo.src} alt={photo.caption} />}
      </div>
      <div className="montage-shade" />
      <header className="montage-header">
        <div>
          <img src="./assets/ittt.png" alt="IT’S TIME TO THINK" />
          <span>TOLEDO / MODO MONTAJE</span>
        </div>
        <div>
          <time aria-label="Hora en vivo de Madrid">
            {madridClock(now).time}
          </time>
          <button onClick={onClose} aria-label="Salir del modo montaje">
            Salir ×
          </button>
        </div>
      </header>
      {live ? (
        <div className="montage-live">
          <iframe
            title="Web oficial ITTT en directo"
            src="https://www.itstimetothink.org/thinkglaos"
            allow="fullscreen"
          />
          <button onClick={() => setLive(false)}>Volver a las escenas</button>
        </div>
      ) : (
        <main
          className={
            "montage-stage " +
            (photo?.website ? "website-scene " : "") +
            (photo?.video || photo?.youtube ? "video-scene" : "")
          }
        >
          <div className="montage-panel">
            <span className="montage-mission">MISIÓN: HACER COMUNIDAD</span>
            <h1>{message[0]}</h1>
            <p>{message[1]}</p>
            <div className="montage-event">
              {event?.speaker}
              <span>
                {event?.date
                  ? new Date(event.date + "T12:00:00").toLocaleDateString(
                      "es-ES",
                      { day: "numeric", month: "long" },
                    )
                  : ""}{" "}
                · {event?.start} · {event?.venue}
              </span>
            </div>
            <div className="montage-team">
              <b>
                {tasks.filter((t) => t.isDone).length} / {tasks.length}
              </b>{" "}
              tareas listas · el equipo está en marcha
            </div>
          </div>
          {photo && (
            <div className="montage-photo-panel">
              {photo.video ? (
                <video
                  key={photo.video}
                  ref={video}
                  src={photo.video}
                  poster={photo.src}
                  autoPlay
                  muted={!sound}
                  playsInline
                  loop
                  controls
                  aria-label={photo.caption}
                />
              ) : photo.youtube ? (
                <iframe
                  key={photo.youtube + sound + running}
                  title={photo.caption}
                  src={
                    "https://www.youtube-nocookie.com/embed/" +
                    photo.youtube +
                    "?autoplay=" +
                    (running ? "1" : "0") +
                    "&mute=" +
                    (sound ? "0" : "1") +
                    "&playsinline=1&rel=0"
                  }
                  allow="autoplay; encrypted-media; fullscreen"
                  allowFullScreen
                />
              ) : (
                <img src={photo.src} alt={photo.caption} />
              )}
              <span>
                {photo.website ? "Una ventana a ITTT" : photo.caption}
              </span>
            </div>
          )}
        </main>
      )}
      <footer className="montage-footer">
        <div className="montage-progress">
          <span style={{ width: progress * 100 + "%" }} />
        </div>
        <div className="montage-controls">
          <div className="scene-buttons">
            <button onClick={() => change(-1)} aria-label="Escena anterior">
              ←
            </button>
            <button onClick={() => setRunning((r) => !r)}>
              {running ? "Pausar escenas" : "Reanudar escenas"}
            </button>
            <button onClick={() => change(1)} aria-label="Siguiente escena">
              →
            </button>
            <span>
              {index + 1} / {scenes.length || messages.length}
            </span>
            <select
              aria-label="Duración de cada escena"
              value={duration}
              onChange={(e) => {
                elapsed.current = 0;
                setDuration(Number(e.target.value));
              }}
            >
              {[12, 20, 30].map((n) => (
                <option key={n} value={n}>
                  {n} s
                </option>
              ))}
            </select>
          </div>
          <div>
            <button
              disabled={!scenes.length}
              onClick={() => {
                elapsed.current = 0;
                setProgress(0);
                setLive(false);
                setIndex(
                  scenes.findIndex(
                    (scene) => scene.video === volunteerVideos[0].url,
                  ),
                );
              }}
            >
              Vídeos del equipo
            </button>
            <button onClick={() => void fullscreen()}>Pantalla completa</button>
            <button
              onClick={() => {
                setLive((l) => !l);
              }}
            >
              {live ? "Cerrar web" : "Web en directo"}
            </button>
          </div>
        </div>
        <div className="montage-music">
          <button
            aria-pressed={sound}
            onClick={() => {
              if (sound) {
                synth.current?.stop();
                synth.current = null;
                audio.current?.pause();
                setSound(false);
              } else {
                try {
                  if (!music.length) synth.current = montageMusic();
                  setSound(true);
                  setNotice(
                    "Sonido activado · música instrumental original y audio de los vídeos.",
                  );
                } catch {
                  setNotice("Puedes cargar tu música con el botón de al lado.");
                }
              }
            }}
          >
            {sound ? "Silenciar" : "Activar sonido"}
          </button>
          <label>
            Cargar música
            <input
              aria-label="Elegir música para el montaje"
              type="file"
              accept="audio/*"
              multiple
              onChange={(e) => {
                audio.current?.pause();
                synth.current?.stop();
                synth.current = null;
                urls.current.forEach(URL.revokeObjectURL);
                const tracks = [...(e.target.files || [])].map((file) => ({
                  url: URL.createObjectURL(file),
                  name: file.name,
                }));
                urls.current = tracks.map((t) => t.url);
                setMusic(tracks);
                setTrack(0);
                setNotice(
                  tracks.length ? "Música cargada. Pulsa reproducir." : "",
                );
                e.target.value = "";
              }}
            />
          </label>
          {music.length > 0 ? (
            <>
              <span>{music[track]?.name}</span>
              <audio
                ref={audio}
                controls
                onPlay={() => setSound(true)}
                src={music[track]?.url}
                onEnded={() => {
                  setTrack((t) => (t + 1) % music.length);
                  setTimeout(
                    () => void audio.current?.play().catch(() => {}),
                    100,
                  );
                }}
              />
            </>
          ) : (
            <span>
              Música ambiente incluida · activa el sonido o carga tu mezcla.
            </span>
          )}
          <small>{photo?.credit || "ITTT"} · imágenes de la web oficial</small>
        </div>
        {notice && (
          <p className="montage-notice" role="status">
            {notice}
          </p>
        )}
      </footer>
    </div>,
    document.body,
  );
}
