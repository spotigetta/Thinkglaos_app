import React, { useEffect, useRef, useState } from "react";
import { madridClock } from "./event-clock";
import { VoiceMix, normalizedVoiceUrl, clampVoiceBoost } from "./voice-mix";
import "./show.css";
import {
  nextCue,
  cueScenes,
  voiceGap,
  voiceSceneLabels,
  type ShowCue,
} from "./show-voices";
import { KineticText } from "./KineticText";
import { stageLabels, sceneSeconds, visualScene } from "./show-scenes";
type Phase =
  | "agradecimiento"
  | "pizzas"
  | "montaje"
  | "ambiente"
  | "llamada"
  | "salida"
  | "intro"
  | "charla"
  | "preguntas"
  | "pantalla";
type Cue = ShowCue;

type State = {
  phase: Phase;
  running: boolean;
  started: number;
  offset: number;
  volume: number;
  duckLevel: number;
  voiceVolume: number;
  voiceBoost: number;
  track: string;
  minutes: number;
  scheduled: string;
  autoCall: boolean;
  autoVoice: boolean;
  internalMusic: boolean;
  voiceGap: number;
  motion: boolean;
};
const defaults: State = {
  phase: "montaje",
  running: false,
  started: 0,
  offset: 0,
  volume: 0.65,
  duckLevel: 0.12,
  voiceVolume: 1,
  voiceBoost: 1.5,
  track: "./media/levels.mp3",
  minutes: 30,
  scheduled: "",
  autoCall: false,
  autoVoice: false,
  internalMusic: false,
  voiceGap: 60,
  motion: true,
};
const elapsed = (s: State) =>
  s.offset + (s.running ? (Date.now() - s.started) / 1000 : 0);
const fmt = (s: number) =>
  `${Math.floor(Math.max(0, s) / 60)
    .toString()
    .padStart(2, "0")}:${Math.floor(Math.max(0, s) % 60)
    .toString()
    .padStart(2, "0")}`;
export default function Show() {
  const projection = new URLSearchParams(location.search).has("projection");
  const [s, set] = useState<State>(() => {
      let saved: Partial<State> = {};
      if (!projection)
        try {
          const p = JSON.parse(
            localStorage.getItem("ittt-show-preferences-v1") || "{}",
          );
          saved = {
            voiceGap: voiceGap(p.voiceGap),
            motion: p.motion !== false,
            voiceBoost: clampVoiceBoost(p.voiceBoost),
            duckLevel:
              typeof p.duckLevel === "number"
                ? Math.max(0, Math.min(1, p.duckLevel))
                : defaults.duckLevel,
          };
        } catch {}
      return { ...defaults, ...saved, started: Date.now(), running: true };
    }),
    [now, tick] = useState(Date.now()),
    [notice, note] = useState(""),
    [online, connected] = useState(false),
    [levels, setLevels] = useState({
      music: 0,
      voice: false,
      introTime: 0,
      introDuration: 180,
    }),
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
  const [speaking, setSpeaking] = useState(""),
    [query, setQuery] = useState(""),
    [bridge, setBridge] = useState(false);
  const [externalMusic, setExternalMusic] = useState(false),
    [advanced, setAdvanced] = useState(false);
  const externalEnabled = useRef(false);
  externalEnabled.current = externalMusic;
  const lastCue = useRef("");
  const voiceMix = useRef<VoiceMix | null>(null);
  const nextVoiceAt = useRef(5);
  const gratitudePending = useRef(false);
  const [bank, setBank] = useState("todas");
  const [deck, setDeck] = useState("voces");
  useEffect(() => {
    if (!projection)
      localStorage.setItem(
        "ittt-show-preferences-v1",
        JSON.stringify({
          voiceGap: s.voiceGap,
          motion: s.motion,
          voiceBoost: s.voiceBoost,
          duckLevel: s.duckLevel,
        }),
      );
  }, [s.voiceGap, s.motion, s.voiceBoost, s.duckLevel]);
  current.current = s;
  const send = (m: { type: string; [key: string]: unknown }) => {
    if (m.type === "reset") seen.current.clear();
    bus.current?.postMessage(m);
  };
  function update(fields: Partial<State>) {
    const next = { ...current.current, ...fields };
    set(next);
    send({ type: "state", state: next });
  }
  function phase(p: Phase) {
    voice.current?.pause();
    gratitudePending.current = false;
    restore();
    send({ type: "reset" });
    update({
      phase: p,
      offset: 0,
      started: Date.now(),
      running: true,
      autoVoice: ["montaje", "ambiente", "llamada", "pizzas"].includes(p),
    });
    if (p === "agradecimiento") {
      const speech = cues.find((c) => cueScenes(c).includes("agradecimiento"));
      if (speech) {
        gratitudePending.current = true;
        speak(speech);
      } else
        note(
          "El discurso todavía se está cargando. Espera y vuelve a seleccionarlo.",
        );
    }
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
    setSpeaking("");
    nextVoiceAt.current =
      elapsed(current.current) + voiceGap(current.current.voiceGap);
    send({ type: "restore-music" });
    if (externalEnabled.current)
      window.postMessage({ type: "ITTT_MUSIC_RESTORE" }, location.origin);
    ramp(
      current.current.running &&
        [
          "montaje",
          "ambiente",
          "llamada",
          "salida",
          "pizzas",
          "agradecimiento",
        ].includes(current.current.phase)
        ? current.current.volume
        : 0,
    );
  }
  useEffect(() => {
    if (!projection && duck.current) {
      send({ type: "duck-music" });
      if (externalEnabled.current)
        window.postMessage(
          { type: "ITTT_MUSIC_DUCK", level: s.duckLevel },
          location.origin,
        );
    }
  }, [s.duckLevel]);
  function speak(cue?: Cue) {
    if (!voice.current) return;
    if (!cue || !cueScenes(cue).includes("agradecimiento"))
      gratitudePending.current = false;
    if (cue) lastCue.current = cue.url;
    nextVoiceAt.current =
      elapsed(current.current) + voiceGap(current.current.voiceGap);
    clearTimeout(pending.current);
    pending.current = undefined;
    voice.current.pause();
    duck.current = true;
    setSpeaking(cue?.text || "Manolo Lama");
    send({ type: "duck-music" });
    if (externalEnabled.current)
      window.postMessage(
        { type: "ITTT_MUSIC_DUCK", level: current.current.duckLevel },
        location.origin,
      );
    voice.current.src = normalizedVoiceUrl(
      cue ? cue.url : "./media/audio-manolo-whatsapp.mp3",
    );
    voice.current.volume = current.current.voiceVolume;
    if (!voiceMix.current) voiceMix.current = new VoiceMix(voice.current);
    voiceMix.current.setBoost(current.current.voiceBoost);
    void voiceMix.current
      .resume()
      .catch(() => note("Pulsa Probar voz para activar el sonido de la mesa."));
    void voice.current.play().catch(() => {
      gratitudePending.current = false;
      note("Audio bloqueado o no disponible. Vuelve a pulsar la frase.");
      restore();
    });
  }
  useEffect(() => {
    if (music.current) music.current.volume = 0;
    const channel = new BroadcastChannel("ittt-show-v1");
    bus.current = channel;
    channel.onmessage = (e) => {
      const m = e.data;
      if (projection) {
        if (m.type === "duck-music") {
          duck.current = true;
          ramp(
            current.current.internalMusic
              ? current.current.volume * current.current.duckLevel
              : 0,
            550,
          );
        }
        if (m.type === "restore-music") {
          duck.current = false;
          ramp(
            current.current.running && current.current.internalMusic
              ? current.current.volume
              : 0,
          );
        }
        if (m.type === "state")
          set({
            ...defaults,
            ...m.state,
            motion: m.state.motion ?? defaults.motion,
            voiceGap: voiceGap(m.state.voiceGap),
            voiceBoost: clampVoiceBoost(m.state.voiceBoost),
          });
        if (m.type === "manolo") speak();
        if (m.type === "cue") speak(m.cue);
        if (m.type === "reset") seen.current.clear();
      } else {
        if (m.type === "ready") {
          connected(true);
          setLevels({
            music: m.musicVolume || 0,
            voice: !!m.voice,
            introTime: m.introTime || 0,
            introDuration: m.introDuration || 180,
          });
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
    const external = (e: MessageEvent) => {
      if (e.source === window && e.data?.type === "ITTT_MUSIC_READY")
        setBridge(true);
    };
    window.addEventListener("message", external);
    window.postMessage({ type: "ITTT_MUSIC_PING" }, location.origin);
    const timer = setInterval(() => {
      tick(Date.now());
      if (!projection)
        window.postMessage({ type: "ITTT_MUSIC_PING" }, location.origin);
      if (projection)
        send({
          type: "ready",
          musicVolume: music.current?.volume,
          voice: voice.current && !voice.current.paused,
          introTime: intro.current?.currentTime,
          introDuration: intro.current?.duration,
        });
    }, 500);
    Promise.all(
      ["./media/locuciones.json?v=pcm-v2", "./media/locuciones-oct25.json"].map(
        (url) =>
          fetch(url, { cache: "no-store" }).then((r) => {
            if (!r.ok) throw new Error("Guion no disponible");
            return r.json();
          }),
      ),
    )
      .then(([original, extra]) => setCues([...original.cues, ...extra.cues]))
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
      window.removeEventListener("message", external);
      channel.close();
      cancelAnimationFrame(fade.current);
      clearTimeout(pending.current);
      clearTimeout(stop.current);
      stream.current?.getTracks().forEach((t) => t.stop());
      voiceMix.current?.close();
      voiceMix.current = null;
    };
  }, []);
  const t =
      !projection && s.phase === "intro" && online
        ? levels.introTime
        : elapsed(s),
    duration =
      s.phase === "charla"
        ? 1080
        : s.phase === "preguntas"
          ? 2700
          : s.phase === "intro"
            ? levels.introDuration
            : s.phase === "salida"
              ? 8
              : s.minutes * 60;
  useEffect(() => {
    if (voice.current) voice.current.volume = s.voiceVolume;
  }, [s.voiceVolume]);
  useEffect(() => {
    voiceMix.current?.setBoost(s.voiceBoost);
  }, [s.voiceBoost]);
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
        autoVoice: true,
        offset: 0,
        started: Date.now(),
        running: true,
      });
  }, [now]);
  useEffect(() => {
    nextVoiceAt.current = elapsed(current.current) + 5;
    lastCue.current = "";
  }, [s.phase]);
  useEffect(() => {
    nextVoiceAt.current = elapsed(current.current) + voiceGap(s.voiceGap);
  }, [s.voiceGap, s.offset, s.autoVoice]);
  useEffect(() => {
    if (
      projection ||
      !s.autoVoice ||
      !s.running ||
      !["montaje", "ambiente", "llamada", "pizzas"].includes(s.phase) ||
      !voice.current?.paused ||
      t < nextVoiceAt.current
    )
      return;
    const cue = nextCue(cues, s.phase, lastCue.current);
    if (cue) speak(cue);
  }, [now]);
  useEffect(() => {
    if (projection)
      document.documentElement.dataset.projectionMotion = s.motion
        ? "full"
        : "off";
    return () => {
      if (projection) delete document.documentElement.dataset.projectionMotion;
    };
  }, [s.motion]);
  useEffect(() => {
    if (!projection && voice.current) {
      if (!s.running) {
        voice.current.pause();
        restore();
      }
    }
  }, [s.running]);
  useEffect(() => {
    if (!projection) return;
    const active =
      s.internalMusic &&
      s.running &&
      [
        "montaje",
        "ambiente",
        "llamada",
        "salida",
        "pizzas",
        "agradecimiento",
      ].includes(s.phase);
    if (music.current) {
      if (active)
        void music.current.play().catch(() =>
          send({
            type: "notice",
            text: "Pulsa una vez en la proyección para activar sonido y pantalla completa.",
          }),
        );
      ramp(
        active
          ? s.phase === "salida"
            ? 0
            : duck.current
              ? s.volume * s.duckLevel
              : s.volume
          : 0,
        s.phase === "salida" ? 7500 : 1000,
      );
    }
    if (
      !s.running ||
      !["montaje", "ambiente", "llamada", "agradecimiento", "pizzas"].includes(
        s.phase,
      )
    ) {
      clearTimeout(pending.current);
      clearTimeout(stop.current);
      voice.current?.pause();
      if (
        ![
          "montaje",
          "ambiente",
          "llamada",
          "agradecimiento",
          "pizzas",
        ].includes(s.phase)
      )
        duck.current = false;
    } else if (duck.current && voice.current?.paused)
      void voice.current.play().catch(() => {});
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
  }, [
    s.phase,
    s.running,
    s.volume,
    s.track,
    s.voiceVolume,
    s.internalMusic,
    s.duckLevel,
  ]);
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
  const index = Math.floor(t / sceneSeconds(s.phase));
  const scene = visualScene(s.phase, index);
  const graphic = [
    "montaje",
    "ambiente",
    "llamada",
    "salida",
    "pizzas",
    "agradecimiento",
  ].includes(s.phase);
  const photoIndex = Math.floor(t / (s.phase === "montaje" ? 36 : 24));
  const photoAt = (i: number) =>
    photos[Math.max(0, i) % Math.max(1, photos.length)] ||
    "./montage/photo-1.jpg";
  const nextStage: Record<string, Phase> = {
    montaje: "agradecimiento",
    agradecimiento: "ambiente",
    pizzas: "montaje",
    ambiente: "llamada",
    llamada: "salida",
    salida: "intro",
    intro: "charla",
    charla: "preguntas",
    preguntas: "pizzas",
    pantalla: "montaje",
  };
  const nextText: Record<string, string> = {
    montaje: "Agradecer al equipo",
    agradecimiento: "Empezar ambientillo · 30 min",
    pizzas: "Volver al montaje",
    ambiente: "Invitar a sentarse",
    llamada: "Acelerar y lanzar intro",
    salida: "Lanzar intro ahora",
    intro: "Saltar a la charla",
    charla: "Pasar a preguntas",
    preguntas: "Pizzas y conversación",
    pantalla: "Volver al montaje",
  };
  if (projection)
    return (
      <div
        data-motion={s.motion ? "full" : "off"}
        className={
          "show-output " +
          s.phase +
          (s.running ? "" : " scene-paused") +
          " visual-layout-" +
          scene.layout +
          " visual-accent-" +
          scene.accent
        }
        onClick={() => {
          if (s.running) void music.current?.play().catch(() => {});
          if (s.phase === "intro") void intro.current?.play().catch(() => {});
          void document.documentElement.requestFullscreen?.().catch(() => {});
        }}
      >
        <div
          className="show-visual previous-photo"
          style={{ backgroundImage: `url('${photoAt(photoIndex - 1)}')` }}
        />
        <div
          className="show-visual current-photo"
          key={photoIndex}
          style={{ backgroundImage: `url('${photoAt(photoIndex)}')` }}
        />
        {graphic && (
          <div className="scene-atmosphere" aria-hidden="true">
            <i />
            <i />
            <i />
            <span className="scene-ring" />
            <span className="scene-orbit-word">THINK</span>
          </div>
        )}
        {["montaje", "ambiente", "pizzas"].includes(s.phase) &&
          index % 5 === 3 &&
          shorts.length > 0 && (
            <iframe
              className="show-bg-video"
              title="Momentos ITTT"
              src={`https://www.youtube-nocookie.com/embed/${shorts[index % shorts.length]}?autoplay=1&mute=1&controls=0&playsinline=1&rel=0`}
              allow="autoplay"
            />
          )}
        <div className="show-wash" />
        <div className="show-brand">
          <img src="./assets/ittt.png" alt="IT’S TIME TO THINK" />
          <span>TOLEDO · EN VIVO</span>
        </div>
        {!["charla", "preguntas"].includes(s.phase) && (
          <time className="show-clock">{madridClock(new Date(now)).time}</time>
        )}
        {["charla", "preguntas"].includes(s.phase) && (
          <aside className="show-speaker">
            <img
              src="./share/laura-rodriguez.jpg"
              alt="Cartel de Laura Rodríguez Rivero"
            />
            <b>Laura Rodríguez Rivero</b>
            <span>Thinkglao · Toledo</span>
          </aside>
        )}
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
          <main
            className={graphic ? "scene-copy" : ""}
            key={graphic ? s.phase + index : s.phase}
          >
            <small>
              {s.phase === "charla"
                ? "18 MINUTOS. UNA IDEA."
                : s.phase === "preguntas"
                  ? "AHORA, TUS PREGUNTAS."
                  : s.phase === "llamada"
                    ? "ENCONTRAMOS NUESTRO SITIO"
                    : s.phase === "salida"
                      ? "ENCENDEMOS LA BOMBILLA"
                      : scene.copy[0]}
            </small>
            <h1>
              {["charla", "preguntas"].includes(s.phase) ? (
                fmt(duration - t)
              ) : s.phase === "salida" ? (
                Math.max(1, 8 - Math.floor(t))
              ) : (
                <KineticText text={scene.copy[1]} effect={scene.effect} />
              )}
            </h1>
            <p>{graphic ? scene.copy[2] : ""}</p>
          </main>
        )}
        {graphic && s.phase !== "salida" && (
          <div className="scene-side-note" key={"note" + index}>
            <small>
              {s.phase === "montaje"
                ? "EL SECRETO DE LA SALSA"
                : "LA RECETA DE ESTA NOCHE"}
            </small>
            <span>
              {
                [
                  "Curiosidad al 100%",
                  "Hecho entre personas",
                  "Buen rollo en construcción",
                  "Aquí todos cuentan",
                ][index % 4]
              }
            </span>
            <i />
          </div>
        )}
        <div className="show-orbit continuous-ticker" aria-hidden="true">
          <div className="ticker-track">
            {[0, 1].map((i) => (
              <span className="ticker-copy" key={i}>
                IT’S TIME TO THINK <span className="ticker-separator"> · </span>{" "}
                LA SALSA ERES TÚ <span className="ticker-separator"> · </span>{" "}
                NOS PARAMOS · NOS ENCONTRAMOS{" "}
                <span className="ticker-separator"> · </span> CURIOSIDAD EN
                COMPAÑÍA <span className="ticker-separator"> · </span> UNA BUENA
                PREGUNTA LO CAMBIA TODO{" "}
                <span className="ticker-separator"> · </span>{" "}
              </span>
            ))}
          </div>
        </div>
        <audio ref={music} src={s.track} loop />
      </div>
    );
  return (
    <div
      className={
        "show-desk desktop-desk deck-" +
        deck +
        " " +
        (advanced ? "desk-advanced" : "")
      }
    >
      <audio
        ref={voice}
        onEnded={() => {
          const advance = gratitudePending.current;
          gratitudePending.current = false;
          restore();
          if (advance) phase("ambiente");
        }}
        onError={() => {
          note("No se pudo cargar esta locución.");
          restore();
        }}
      />
      <div className="dj-live">
        <b>{speaking || "Voces listas · selecciona una frase"}</b>
        <label className="voice-boost-control">
          Refuerzo de voz · {Math.round(s.voiceBoost * 100)}%
          <input
            aria-label="Refuerzo de voz"
            type="range"
            min=".5"
            max="3"
            step=".1"
            value={s.voiceBoost}
            onChange={(e) =>
              update({ voiceBoost: clampVoiceBoost(Number(e.target.value)) })
            }
          />
          <meter
            aria-label="Nivel real de voz"
            min="0"
            max="1"
            value={voiceMix.current?.peak() || 0}
          />
        </label>
        <button
          onClick={() => {
            voice.current?.pause();
            gratitudePending.current = false;
            restore();
          }}
        >
          Parar voz ■
        </button>
      </div>
      <header>
        <a href="?">← Volver al equipo</a>
        <h1>Dirección de escena</h1>
        <button onClick={() => setAdvanced((v) => !v)}>
          {advanced ? "Cerrar ajustes" : "Ajustes y pantalla compartida"}
        </button>
        <p>Una ventana para ti. Otra, limpia, para el público.</p>
        <button disabled={!cues.length} onClick={() => speak(cues[0])}>
          Probar voz ▶
        </button>
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
      <nav className="desk-tabs" aria-label="Controles del directo">
        {["voces", "tiempo", "audio"].map((d) => (
          <button key={d} aria-pressed={deck === d} onClick={() => setDeck(d)}>
            {d === "voces"
              ? "Banco de voces"
              : d === "tiempo"
                ? "Tiempo y transporte"
                : "Mezclador de música"}
          </button>
        ))}
      </nav>
      <section className="show-monitor">
        <label>
          Música en proyección <meter min="0" max="1" value={levels.music} />
          {Math.round(levels.music * 100)}% ·{" "}
          {speaking ? "Locución en directo" : "Voces listas"}
        </label>
        <small>EN PANTALLA · {stageLabels[s.phase]}</small>
        <strong>
          {["charla", "preguntas"].includes(s.phase)
            ? fmt(duration - t)
            : madridClock(new Date(now)).time}
        </strong>
        <span>
          {fmt(t)} transcurridos · {s.running ? "En marcha" : "Pausado"}
        </span>
      </section>
      <section className="scene-selector">
        <h2>Elige el momento</h2>
        <div className="scene-steps">
          {(["montaje", "ambiente", "llamada"] as Phase[]).map((p, i) => (
            <button
              key={p}
              aria-label={
                p === "ambiente"
                  ? "Ambiente"
                  : p === "llamada"
                    ? "Que se sienten"
                    : "Montaje"
              }
              aria-pressed={s.phase === p}
              onClick={() => phase(p)}
            >
              <span>0{i + 1}</span>
              <b>{["Montaje", "Ambientillo", "A sentarse"][i]}</b>
              <small>
                {
                  [
                    "Suave · mientras preparamos",
                    "30 min · frases y locuciones",
                    "Más energía · llamada a sala",
                  ][i]
                }
              </small>
            </button>
          ))}
        </div>
        <button
          className="scene-next"
          onClick={() => phase(nextStage[s.phase])}
        >
          {nextText[s.phase]} <span aria-hidden="true">→</span>
        </button>
        <details>
          <summary>Intro, charla y preguntas · selección directa</summary>
          <div className="show-actions">
            {(["salida", "intro", "charla", "preguntas"] as Phase[]).map(
              (p, i) => (
                <button
                  key={p}
                  aria-pressed={s.phase === p}
                  onClick={() => phase(p)}
                >
                  {
                    [
                      "Acelerar → intro",
                      "Lanzar intro",
                      "Charla · 18 min",
                      "Preguntas · 45 min",
                    ][i]
                  }
                </button>
              ),
            )}
          </div>
        </details>
        <div className="show-actions voice-moments">
          <button onClick={() => phase("agradecimiento")}>
            Agradecimiento · discurso
          </button>
          <button onClick={() => phase("pizzas")}>Pizzas · conversación</button>
        </div>
        <label>
          <input
            type="checkbox"
            checked={s.motion}
            onChange={(e) => update({ motion: e.target.checked })}
          />{" "}
          Animaciones del proyector
        </label>
        <p>
          El montaje tiene sus propias cuñas. El ambientillo las reparte durante
          media hora. El agradecimiento da paso al ambientillo al terminar. «A
          sentarse» activa la llamada. Tú decides cuándo acelerar y lanzar la
          intro.
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
            onChange={(e) => {
              send({ type: "reset" });
              update({ offset: Number(e.target.value), started: Date.now() });
            }}
          />
        </label>
        <details>
          <summary>Programación y duración del previo</summary>
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
        </details>
      </section>
      <section>
        <h2>3 · Mezclador</h2>
        <label>
          Música durante la voz · {Math.round(s.duckLevel * 100)}% del nivel
          normal
          <input
            aria-label="Nivel bajo de música durante las voces"
            type="range"
            min="0"
            max="1"
            step=".01"
            value={s.duckLevel}
            onChange={(e) => update({ duckLevel: Number(e.target.value) })}
          />
        </label>
        <small>
          0% silencia la música; 100% mantiene su nivel. Al terminar la voz
          vuelve al volumen anterior.
        </small>
        <label>
          <input
            type="checkbox"
            checked={externalMusic}
            disabled={!bridge}
            onChange={(e) => {
              setExternalMusic(e.target.checked);
              window.postMessage(
                { type: "ITTT_MUSIC_ARM", enabled: e.target.checked },
                location.origin,
              );
            }}
          />
          Bajar mi pestaña de música solo mientras habla una voz
        </label>
        <button
          onClick={() => {
            voice.current?.pause();
            gratitudePending.current = false;
            restore();
            setExternalMusic(false);
            window.postMessage(
              { type: "ITTT_MUSIC_ARM", enabled: false },
              location.origin,
            );
            update({ autoVoice: false, internalMusic: false });
          }}
        >
          PARAR AUTOMATISMOS · música libre
        </button>
        <details>
          <summary>Conectar YouTube Music o Spotify web</summary>
          <p>
            En Edge abre edge://extensions, activa Modo desarrollador y pulsa
            Cargar descomprimida. Selecciona la carpeta extension-music del
            proyecto o descarga y descomprime el archivo siguiente. Abre la
            música en el mismo navegador y perfil y recarga esta mesa.
          </p>
          <a href="./downloads/thinkglaos-mezclador.zip" download>
            Descargar extensión de música
          </a>
        </details>
        <p>
          {bridge
            ? "● Control externo conectado · YouTube Music / Spotify web"
            : "Control externo sin conectar · carga la extensión de la carpeta extension-music para controlar YouTube Music o Spotify web."}
        </p>
        <label>
          <input
            type="checkbox"
            checked={s.internalMusic}
            onChange={(e) => update({ internalMusic: e.target.checked })}
          />
          Activar música interna (opcional)
        </label>
        <label>
          Música (sonido de esta aplicación)
          <select
            value={s.track}
            onChange={(e) => update({ track: e.target.value })}
          >
            <option value="./media/levels.mp3">Levels · Avicii</option>
            <option value="./media/disco-yes.mp3">Disco Yes · Tom Misch</option>
            <option value="./media/disco-yes-previa-3min.mp3">
              Disco Yes · previa 3:00 · salida suave
            </option>
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
        <button onClick={() => speak()}>
          Escuchar a Manolo · bajar música y recuperar
        </button>
        <p>
          Las voces se reproducen desde esta mesa, independientemente de la
          música. El control externo actúa solo sobre pestañas de YouTube Music
          y Spotify web cuando la extensión está conectada.
        </p>
      </section>
      <section>
        <h2>4 · Banco de voces</h2>
        <label>
          <input
            type="checkbox"
            checked={s.autoVoice}
            onChange={(e) => update({ autoVoice: e.target.checked })}
          />
          Locuciones automáticas en esta escena
        </label>
        <input
          aria-label="Buscar frase"
          placeholder="Buscar una frase…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <small className="voice-next-status" role="status">
          {speaking
            ? "Voz en directo · la pausa comienza al terminar"
            : s.autoVoice &&
                s.running &&
                ["montaje", "ambiente", "llamada", "pizzas"].includes(s.phase)
              ? `Siguiente cuña en ${fmt(Math.max(0, nextVoiceAt.current - t))}`
              : "Automatismo desactivado en esta escena"}
        </small>
        <div className="voice-frequency">
          <label>
            Frecuencia · pausa entre frases: {s.voiceGap} s
            <input
              aria-label="Pausa entre locuciones"
              type="range"
              min="10"
              max="240"
              step="5"
              value={s.voiceGap}
              onChange={(e) =>
                update({ voiceGap: voiceGap(Number(e.target.value)) })
              }
            />
          </label>
          <div className="show-actions">
            <button onClick={() => update({ voiceGap: 120 })}>
              Menos frases
            </button>
            <button onClick={() => update({ voiceGap: 60 })}>Normal</button>
            <button onClick={() => update({ voiceGap: 20 })}>Más frases</button>
            <button
              onClick={() => {
                const c = nextCue(cues, s.phase, lastCue.current);
                if (c) speak(c);
              }}
            >
              Siguiente frase ▶
            </button>
          </div>
          <select
            aria-label="Filtrar voces por momento"
            value={bank}
            onChange={(e) => setBank(e.target.value)}
          >
            <option value="todas">Todas las voces · {cues.length}</option>
            {Object.entries(voiceSceneLabels).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <p>
          Voces intercaladas por escena. La pausa cuenta al terminar cada frase:
          no se cortan ni se superponen. Charla y preguntas siempre sin cuñas
          automáticas.
        </p>
        <div className="show-cues">
          {cues
            .map((c, i) => ({ c, i }))
            .filter(
              ({ c }) => bank === "todas" || cueScenes(c).includes(bank as any),
            )
            .filter(({ c }) =>
              c.text.toLocaleLowerCase().includes(query.toLocaleLowerCase()),
            )
            .map(({ c, i }) => (
              <button
                key={i}
                aria-pressed={speaking === c.text}
                onClick={() => speak(c)}
              >
                <b>
                  {i + 1} ·{" "}
                  {cueScenes(c)
                    .map((p) => voiceSceneLabels[p])
                    .join(" / ")}{" "}
                  · {fmt(c.end - c.start)}
                </b>
                {c.text}
                {c.note && (
                  <small className="cue-recording-note">{c.note}</small>
                )}
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
