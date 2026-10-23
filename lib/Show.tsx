import React, { useEffect, useRef, useState } from "react";
import { madridClock } from "./event-clock";
import "./show.css";
type Phase =
  | "ambiente"
  | "llamada"
  | "salida"
  | "intro"
  | "charla"
  | "preguntas"
  | "pantalla";
type Cue = {
  start: number;
  end: number;
  text: string;
  voice: number;
  url: string;
};
type State = {
  phase: Phase;
  running: boolean;
  started: number;
  offset: number;
  volume: number;
  voiceVolume: number;
  track: string;
  minutes: number;
  scheduled: string;
  autoCall: boolean;
};
const defaults: State = {
  phase: "ambiente",
  running: false,
  started: 0,
  offset: 0,
  volume: 0.65,
  voiceVolume: 1,
  track: "./media/levels.mp3",
  minutes: 30,
  scheduled: "",
  autoCall: false,
};
const elapsed = (s: State) =>
  s.offset + (s.running ? (Date.now() - s.started) / 1000 : 0);
const fmt = (s: number) =>
  `${Math.floor(Math.max(0, s) / 60)
    .toString()
    .padStart(2, "0")}:${Math.floor(Math.max(0, s) % 60)
    .toString()
    .padStart(2, "0")}`;
const phrases = [
  "La noche empieza contigo.",
  "Una ciudad. Mil preguntas.",
  "Nos paramos. Nos encontramos.",
  "Tu curiosidad enciende la bombilla.",
  "Aquí los desconocidos se convierten en amigos.",
  "Piensa distinto. Escucha de verdad.",
];
const calls = [
  "¡Vamos buscando sitio!",
  "Coge tu cerveza. Ven a pensar.",
  "El fuet puede esperar. Tú no.",
  "Nos vamos sentando.",
];
export default function Show() {
  const projection = new URLSearchParams(location.search).has("projection");
  const [s, set] = useState<State>(defaults),
    [now, tick] = useState(Date.now()),
    [notice, note] = useState(""),
    [online, connected] = useState(false),
    [levels, setLevels] = useState({ music: 0, voice: false }),
    [cues, setCues] = useState<Cue[]>([]),
    [photos, setPhotos] = useState<string[]>([]),
    [shorts, setShorts] = useState<string[]>([]);
  const bus = useRef<BroadcastChannel | null>(null),
    win = useRef<Window | null>(null),
    current = useRef(s),
    seen = useRef(new Set<number>()),
    music = useRef<HTMLAudioElement>(null),
    voice = useRef<HTMLAudioElement>(null),
    intro = useRef<HTMLVideoElement>(null),
    screen = useRef<HTMLVideoElement>(null),
    stream = useRef<MediaStream | null>(null),
    fade = useRef(0),
    pending = useRef<ReturnType<typeof setTimeout> | undefined>(undefined),
    stop = useRef<ReturnType<typeof setTimeout> | undefined>(undefined),
    duck = useRef(false);
  current.current = s;
  const send = (m: object) => bus.current?.postMessage(m);
  function update(fields: Partial<State>) {
    const next = { ...current.current, ...fields };
    set(next);
    send({ type: "state", state: next });
  }
  function phase(p: Phase) {
    update({ phase: p, offset: 0, started: Date.now(), running: true });
  }
  function ramp(target: number, ms = 1000) {
    cancelAnimationFrame(fade.current);
    const start = performance.now(),
      from = music.current?.volume || 0;
    function step() {
      const p = Math.min(1, (performance.now() - start) / ms);
      if (music.current)
        music.current.volume = from + (target - from) * (p * p * (3 - 2 * p));
      if (p < 1) fade.current = requestAnimationFrame(step);
    }
    step();
  }
  function restore() {
    duck.current = false;
    ramp(
      current.current.running &&
        ["ambiente", "llamada", "salida"].includes(current.current.phase)
        ? current.current.volume
        : 0,
    );
  }
  function speak(cue?: Cue) {
    if (!voice.current) return;
    clearTimeout(pending.current);
    clearTimeout(stop.current);
    voice.current.pause();
    duck.current = true;
    ramp(current.current.volume * 0.23, 550);
    voice.current.src = cue ? cue.url : "./media/audio-manolo-whatsapp.mp3";
    voice.current.currentTime = 0;
    voice.current.volume = current.current.voiceVolume;
    pending.current = setTimeout(() => {
      void voice.current?.play().catch(() =>
        send({
          type: "notice",
          text: "Pulsa una vez en la proyección para activar el sonido.",
        }),
      );
    }, 600);
  }
  useEffect(() => {
    if (music.current) music.current.volume = 0;
    const channel = new BroadcastChannel("ittt-show-v1");
    bus.current = channel;
    channel.onmessage = (e) => {
      const m = e.data;
      if (projection) {
        if (m.type === "state") set(m.state);
        if (m.type === "manolo") speak();
        if (m.type === "cue") speak(m.cue);
        if (m.type === "reset") seen.current.clear();
      } else {
        if (m.type === "ready") {
          connected(true);
          setLevels({ music: m.musicVolume || 0, voice: !!m.voice });
          channel.postMessage({ type: "state", state: current.current });
        }
        if (m.type === "notice") note(m.text);
        if (m.type === "intro-ended") phase("charla");
      }
    };
    if (projection) {
      send({ type: "ready" });
      (window as any).itttScreen = (media: MediaStream) => {
        stream.current = media;
        if (screen.current) screen.current.srcObject = media;
      };
    }
    const timer = setInterval(() => {
      tick(Date.now());
      if (projection)
        send({
          type: "ready",
          musicVolume: music.current?.volume,
          voice: voice.current && !voice.current.paused,
        });
    }, 500);
    fetch("./media/locuciones.json")
      .then((r) => r.json())
      .then((d) => setCues(d.cues))
      .catch(() => note("No se pudo cargar el guion."));
    fetch("./montage/photos.json")
      .then((r) => r.json())
      .then((d) => setPhotos(d.photos.map((p: { src: string }) => p.src)))
      .catch(() => {});
    fetch("./media/youtube.json")
      .then((r) => r.json())
      .then((d) =>
        setShorts(
          d.items
            .filter((x: { kind: string }) => x.kind === "shorts")
            .map((x: { id: string }) => x.id),
        ),
      )
      .catch(() => {});
    return () => {
      clearInterval(timer);
      channel.close();
      cancelAnimationFrame(fade.current);
      clearTimeout(pending.current);
      clearTimeout(stop.current);
      stream.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);
  const t = elapsed(s),
    duration =
      s.phase === "charla"
        ? 1080
        : s.phase === "preguntas"
          ? 2700
          : s.minutes * 60;
  useEffect(() => {
    if (
      !projection &&
      s.scheduled &&
      !s.running &&
      Date.now() >= new Date(s.scheduled).getTime()
    )
      update({
        scheduled: "",
        phase: "ambiente",
        offset: 0,
        started: Date.now(),
        running: true,
      });
  }, [now]);
  useEffect(() => {
    if (!projection || !s.running || !["ambiente", "llamada"].includes(s.phase))
      return;
    const female = cues.filter((c) => c.voice === 1),
      male = cues.filter((c) => c.voice === 2);
    const pool =
        s.phase === "llamada"
          ? cues.filter((c) => c.voice === 3)
          : Array.from(
              { length: Math.max(female.length, male.length) },
              (_, i) => [male[i], female[i]],
            )
              .flat()
              .filter(Boolean),
      slot = s.phase === "llamada" ? 180 : Math.max(60, s.minutes * 60 - 180);
    const spoken = pool.reduce((sum, c) => sum + c.end - c.start, 0),
      gap = Math.max(1, (slot - spoken - 10) / Math.max(1, pool.length));
    let position = 5;
    pool.forEach((c, i) => {
      const at = position,
        id = cues.indexOf(c);
      position += c.end - c.start + gap;
      if (t >= at && t < at + 3 && !seen.current.has(id)) {
        seen.current.add(id);
        speak(c);
      }
    });
  }, [now]);
  useEffect(() => {
    if (!projection) return;
    const active =
      s.running && ["ambiente", "llamada", "salida"].includes(s.phase);
    if (music.current) {
      if (active)
        void music.current.play().catch(() =>
          send({
            type: "notice",
            text: "Pulsa una vez en la proyección para activar sonido y pantalla completa.",
          }),
        );
      ramp(active ? (duck.current ? s.volume * 0.23 : s.volume) : 0);
    }
    if (!s.running || !["ambiente", "llamada"].includes(s.phase)) {
      clearTimeout(pending.current);
      clearTimeout(stop.current);
      voice.current?.pause();
      duck.current = false;
    }
    if (intro.current) {
      intro.current.volume = s.voiceVolume;
      if (s.phase === "intro" && s.running)
        void intro.current.play().catch(() =>
          send({
            type: "notice",
            text: "Pulsa la proyección para activar la intro.",
          }),
        );
      else intro.current.pause();
    }
    if (screen.current) screen.current.srcObject = stream.current;
  }, [s.phase, s.running, s.volume, s.track, s.voiceVolume]);
  useEffect(() => {
    if (projection && intro.current && s.phase === "intro")
      intro.current.currentTime = s.offset;
  }, [s.offset, s.phase]);
  useEffect(() => {
    if (projection && music.current)
      music.current.playbackRate =
        s.phase === "salida" ? 1 + Math.min(8, t) * 0.015 : 1;
    if (!s.running) return;
    if (
      !projection &&
      s.autoCall &&
      s.phase === "ambiente" &&
      t >= s.minutes * 60 - 180
    )
      phase("llamada");
    if (s.phase === "salida" && t >= 8 && !projection) phase("intro");
    if (["charla", "preguntas"].includes(s.phase) && t >= duration) {
      if (!projection) update({ running: false, offset: duration });
      else if (!seen.current.has(-duration)) {
        seen.current.add(-duration);
        const a = new AudioContext();
        [440, 660, 330].forEach((f, i) => {
          const o = a.createOscillator(),
            g = a.createGain();
          o.frequency.value = f;
          g.gain.value = 0.12;
          o.connect(g).connect(a.destination);
          o.start(a.currentTime + i * 0.17);
          o.stop(a.currentTime + i * 0.17 + 0.14);
        });
        setTimeout(() => void a.close(), 1000);
      }
    }
  }, [now]);
  async function share() {
    try {
      const media = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false,
      });
      stream.current?.getTracks().forEach((t) => t.stop());
      stream.current = media;
      (win.current as any)?.itttScreen?.(media);
      phase("pantalla");
    } catch {
      note("No se compartió ninguna pantalla.");
    }
  }
  const index = Math.floor(t / (s.phase === "llamada" ? 3 : 12));
  if (projection)
    return (
      <div
        className={"show-output " + s.phase}
        onClick={() => {
          if (s.running) void music.current?.play().catch(() => {});
          if (s.phase === "intro") void intro.current?.play().catch(() => {});
          void document.documentElement.requestFullscreen?.().catch(() => {});
        }}
      >
        <div
          className="show-visual"
          key={Math.floor(index / 2)}
          style={{
            backgroundImage: `url('${photos[Math.floor(index / 2) % Math.max(1, photos.length)] || "./montage/photo-1.jpg"}')`,
          }}
        />
        {["ambiente", "llamada", "salida"].includes(s.phase) &&
          index % 3 === 1 && (
            <video
              className="show-bg-video"
              key={index}
              src={
                index % 2
                  ? "./media/voluntarios-secreto-salsa.mp4"
                  : "./media/voluntarios-historia-toledo.mp4"
              }
              autoPlay
              muted
              playsInline
              loop
            />
          )}
        {s.phase === "ambiente" && index % 5 === 3 && shorts.length > 0 && (
          <iframe
            className="show-bg-video"
            title="Momentos ITTT"
            src={`https://www.youtube-nocookie.com/embed/${shorts[index % shorts.length]}?autoplay=1&mute=1&controls=0&playsinline=1&rel=0`}
            allow="autoplay"
          />
        )}
        <div className="show-wash" />
        <div className="show-brand">
          IT’S TIME TO THINK <span>TOLEDO · EN VIVO</span>
        </div>
        <time className="show-clock">{madridClock(new Date(now)).time}</time>
        {s.phase === "intro" ? (
          <video
            className="show-intro"
            ref={intro}
            src="./media/intro-thunder.mp4"
            autoPlay
            playsInline
            onEnded={() => send({ type: "intro-ended" })}
          />
        ) : s.phase === "pantalla" ? (
          <video
            className="show-intro"
            ref={screen}
            autoPlay
            muted
            playsInline
          />
        ) : (
          <main key={index}>
            <small>
              {s.phase === "charla"
                ? "18 MINUTOS. UNA IDEA."
                : s.phase === "preguntas"
                  ? "AHORA, TUS PREGUNTAS."
                  : s.phase === "llamada"
                    ? "ENCONTRAMOS NUESTRO SITIO"
                    : s.phase === "salida"
                      ? "ENCENDEMOS LA BOMBILLA"
                      : "CONSTRUYENDO COMUNIDAD"}
            </small>
            <h1>
              {["charla", "preguntas"].includes(s.phase)
                ? fmt(duration - t)
                : s.phase === "salida"
                  ? Math.max(1, 8 - Math.floor(t))
                  : s.phase === "llamada"
                    ? calls[index % calls.length]
                    : phrases[index % phrases.length]}
            </h1>
            <p>
              {s.phase === "ambiente"
                ? "Una cerveza. Una pregunta. Un futuro amigo."
                : s.phase === "llamada"
                  ? "Coge algo de beber. Acércate. Nos vamos sentando."
                  : ""}
            </p>
          </main>
        )}
        <div className="show-orbit">
          PENSAR · ENCONTRARNOS · ESCUCHAR · COMPARTIR ·{" "}
        </div>
        <audio ref={music} src={s.track} loop />
        <audio ref={voice} onEnded={restore} />
      </div>
    );
  return (
    <div className="show-desk">
      <header>
        <a href="?">← Volver al equipo</a>
        <h1>Dirección de escena</h1>
        <p>Una ventana para ti. Otra, limpia, para el público.</p>
        <button
          onClick={() => {
            win.current = window.open(
              location.pathname + "?projection=1",
              "ittt-projection",
            );
            note(
              "Arrastra la nueva ventana al segundo monitor y pulsa una vez allí para activar sonido y pantalla completa.",
            );
          }}
        >
          Abrir proyector ↗
        </button>
        <span>{online ? "● Proyector conectado" : "○ Abre la proyección"}</span>
      </header>
      <section className="show-monitor">
        <label>
          Música en proyección <meter min="0" max="1" value={levels.music} />
          {Math.round(levels.music * 100)}% ·{" "}
          {levels.voice ? "Locución en directo" : "Sin locución"}
        </label>
        <small>EN EMISIÓN · {s.phase.toUpperCase()}</small>
        <strong>
          {["charla", "preguntas"].includes(s.phase)
            ? fmt(duration - t)
            : madridClock(new Date(now)).time}
        </strong>
        <span>
          {fmt(t)} transcurridos · {s.running ? "En marcha" : "Pausado"}
        </span>
      </section>
      <section>
        <h2>1 · Escena</h2>
        <div className="show-actions">
          {(
            [
              "ambiente",
              "llamada",
              "salida",
              "intro",
              "charla",
              "preguntas",
            ] as Phase[]
          ).map((p, i) => (
            <button
              key={p}
              aria-pressed={s.phase === p}
              onClick={() => phase(p)}
            >
              {
                [
                  "Ambiente",
                  "Que se sienten",
                  "Acelerar → intro",
                  "Lanzar intro",
                  "Charla · 18 min",
                  "Preguntas · 45 min",
                ][i]
              }
            </button>
          ))}
        </div>
        <p>
          La llamada dura lo que necesites. «Acelerar» hace una transición de 8
          segundos y lanza la intro. Al acabar comienza la charla. Las preguntas
          se inician manualmente.
        </p>
      </section>
      <section>
        <h2>2 · Tiempo y directo</h2>
        <div className="show-actions">
          <button
            onClick={() =>
              update({ running: !s.running, offset: t, started: Date.now() })
            }
          >
            {s.running ? "Pausar" : "Continuar"}
          </button>
          <button
            onClick={() => {
              send({ type: "reset" });
              update({ offset: 0, started: Date.now() });
            }}
          >
            Reiniciar fase
          </button>
          <button
            onClick={() => {
              send({ type: "reset" });
              update({ offset: Math.max(0, t - 30), started: Date.now() });
            }}
          >
            −30 s
          </button>
          <button
            onClick={() => update({ offset: t + 30, started: Date.now() })}
          >
            +30 s
          </button>
        </div>
        <label>
          Posición · {fmt(t)}
          <input
            aria-label="Posición de la fase"
            type="range"
            min="0"
            max={duration}
            value={Math.min(duration, t)}
            onChange={(e) =>
              update({ offset: Number(e.target.value), started: Date.now() })
            }
          />
        </label>
        <label>
          Duración del previo (minutos)
          <input
            type="number"
            min="10"
            max="120"
            value={s.minutes}
            onChange={(e) =>
              update({ minutes: Math.max(10, Number(e.target.value)) })
            }
          />
        </label>
        <label>
          <input
            type="checkbox"
            checked={s.autoCall}
            onChange={(e) => update({ autoCall: e.target.checked })}
          />
          Pasar automáticamente a la llamada en los últimos 3 minutos
        </label>
        <label>
          Programar inicio (hora local)
          <input
            type="datetime-local"
            value={s.scheduled}
            onChange={(e) => update({ scheduled: e.target.value })}
          />
        </label>
        <button onClick={() => update({ scheduled: "" })}>
          Cancelar programación
        </button>
      </section>
      <section>
        <h2>3 · Sonido</h2>
        <label>
          Música (sonido de esta aplicación)
          <select
            value={s.track}
            onChange={(e) => update({ track: e.target.value })}
          >
            <option value="./media/levels.mp3">Levels · Avicii</option>
            <option value="./media/disco-yes.mp3">Disco Yes · Tom Misch</option>
          </select>
        </label>
        <label>
          Mezcla propia
          <input
            type="file"
            accept="audio/*"
            onChange={(e) => {
              if (e.target.files?.[0])
                update({ track: URL.createObjectURL(e.target.files[0]) });
            }}
          />
        </label>
        <label>
          Música · {Math.round(s.volume * 100)}%
          <input
            type="range"
            min="0"
            max="1"
            step=".01"
            value={s.volume}
            onChange={(e) => update({ volume: Number(e.target.value) })}
          />
        </label>
        <label>
          Locución · {Math.round(s.voiceVolume * 100)}%
          <input
            type="range"
            min="0"
            max="1"
            step=".01"
            value={s.voiceVolume}
            onChange={(e) => update({ voiceVolume: Number(e.target.value) })}
          />
        </label>
        <button onClick={() => send({ type: "manolo" })}>
          Escuchar a Manolo · bajar música y recuperar
        </button>
        <p>
          Los fundidos controlan la música de este panel. La web no puede
          cambiar el volumen de Spotify ni de Windows. Carga tu música aquí para
          mezclarla automáticamente.
        </p>
      </section>
      <section>
        <h2>4 · Locuciones</h2>
        <p>
          {cues.length} fragmentos. Bloques 1 y 2 en los primeros{" "}
          {s.minutes - 3} minutos; bloque 3 durante los 3 minutos de llamada.
          Escucha o repite cualquier fragmento.
        </p>
        <div className="show-cues">
          {cues.map((c, i) => (
            <button key={i} onClick={() => send({ type: "cue", cue: c })}>
              <b>
                {i + 1} · Voz {c.voice} · {fmt(c.end - c.start)}
              </b>
              {c.text}
            </button>
          ))}
        </div>
      </section>
      <section>
        <h2>5 · Tu pantalla</h2>
        <button onClick={() => void share()}>
          Compartir una ventana o pantalla
        </button>
        <p>
          Regresa a «Ambiente» para ocultarla. Usa «Dejar de compartir» del
          navegador para terminar la captura.
        </p>
      </section>
      {notice && (
        <p className="show-notice" role="status">
          {notice}
        </p>
      )}
    </div>
  );
}
