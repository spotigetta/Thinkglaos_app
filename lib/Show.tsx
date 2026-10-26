import { mixPolicy, VolumeFader } from "./show-mixer";
import { ChannelMeters, VideoIntervention } from "./ShowChannels";
import React, { useEffect, useRef, useState } from "react";
import { madridClock } from "./event-clock";
import { VoiceMix, normalizedVoiceUrl, clampVoiceBoost } from "./voice-mix";
import "./show.css";
import {
  nextCue,
  cueScenes,
  montagePace,
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
  videoCues: boolean;
  intervention: string;
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
  autoCall: true,
  autoVoice: true,
  internalMusic: false,
  voiceGap: 60,
  motion: true,
  videoCues: false,
  intervention: "",
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
      introPeak: 0,
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
    stream = useRef<MediaStream | null>(null);
  const [speaking, setSpeaking] = useState(""),
    [query, setQuery] = useState(""),
    [bridge, setBridge] = useState(false);
  const [externalMusic, setExternalMusic] = useState(true);
  const [externalTrack, setExternalTrack] = useState({
    title: "Abre YouTube Music o Spotify",
    artist: "",
    playing: false,
    volume: 0,
  });
  const musicMix = useRef<VoiceMix | null>(null),
    introMix = useRef<VoiceMix | null>(null);
  const fader = useRef(new VolumeFader());
  const foreground = useRef(false),
    videoActive = useRef(false),
    lastPhaseClick = useRef(0);
  const lastExternal = useRef("");
  const [armed, setArmed] = useState(false);
  const [qr, setQr] = useState("");
  useEffect(() => {
    import("qrcode")
      .then((q) =>
        q.toDataURL(
          "https://chat.whatsapp.com/BhxDspfeSMB9POmHew2zEC?s=cl&p=a&mlu=4&ilr=4",
          { width: 700, margin: 4, errorCorrectionLevel: "M" },
        ),
      )
      .then(setQr);
  }, []);
  const deskId = useRef(crypto.randomUUID()),
    ownsDesk = useRef(false);
  const externalEnabled = useRef(false);
  externalEnabled.current = externalMusic;
  const lastCue = useRef("");
  const voiceGeneration = useRef(0);
  const voiceMix = useRef<VoiceMix | null>(null);
  const nextVoiceAt = useRef(5);
  const montagePlayed = useRef(new Set<string>());
  const automaticCue = useRef<Cue | null>(null);
  const cuesRef = useRef<Cue[]>([]);
  const gratitudePending = useRef(false);
  const [bank, setBank] = useState("todas");

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
  cuesRef.current = cues;
  const send = (m: { type: string; [key: string]: unknown }) => {
    if (m.type === "reset") seen.current.clear();
    if (m.type === "state" && !projection && !ownsDesk.current) return;
    bus.current?.postMessage(m);
  };
  function update(fields: Partial<State>) {
    const next = { ...current.current, ...fields };
    current.current = next;
    set(next);
    send({ type: "state", state: next });
  }
  function phase(p: Phase) {
    if (
      p === current.current.phase &&
      Date.now() - lastPhaseClick.current < 600
    )
      return;
    lastPhaseClick.current = Date.now();
    if (p === "montaje") montagePlayed.current.clear();
    automaticCue.current = null;
    if (p === "llamada" && music.current) music.current.currentTime = 0;
    videoActive.current = false;
    update({ intervention: "" });
    voiceGeneration.current++;
    voice.current?.pause();
    gratitudePending.current = false;
    restore();
    send({ type: "reset" });
    update({
      phase: p,
      internalMusic:
        p === "llamada"
          ? true
          : ["montaje", "ambiente", "pizzas"].includes(p)
            ? false
            : current.current.internalMusic,
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
  function ramp(target: number, ms = 1400) {
    if (music.current) fader.current.set(music.current, target, ms);
  }
  function reconcileMix() {
    if (projection || !ownsDesk.current) return;
    const state = current.current;
    const mix = mixPolicy(state, foreground.current || videoActive.current);
    if (music.current) {
      if (state.internalMusic && state.running && mix.local > 0) {
        if (!musicMix.current) {
          musicMix.current = new VoiceMix(music.current);
          musicMix.current.setBoost(1);
        }
        void musicMix.current.resume().catch(() => {});
        void music.current.play().catch(() => {
          update({ internalMusic: false });
          note(
            "No ha podido iniciar la canción local. Música externa recuperada; vuelve a activar la canción.",
          );
        });
      }
      ramp(mix.local, mix.ms);
    }
    const key = JSON.stringify([mix.external, mix.ms, externalEnabled.current]);
    if (key !== lastExternal.current) {
      lastExternal.current = key;
      window.postMessage(
        { type: "ITTT_MUSIC_ARM", enabled: externalEnabled.current },
        location.origin,
      );
      if (externalEnabled.current)
        window.postMessage(
          { type: "ITTT_MUSIC_TARGET", level: mix.external, ms: mix.ms },
          location.origin,
        );
    }
  }
  function restore() {
    setSpeaking("");
    scheduleNextVoice();
    foreground.current = false;
    reconcileMix();
  }
  function scheduleNextVoice() {
    const state = current.current;
    const gap =
      state.phase === "montaje"
        ? (() => {
            const pace = montagePace(
              cuesRef.current,
              montagePlayed.current,
              new Date(),
            );
            return pace.secondsLeft && pace.remaining.length
              ? pace.gap
              : Infinity;
          })()
        : voiceGap(state.voiceGap);
    nextVoiceAt.current = elapsed(state) + gap;
  }
  useEffect(() => {
    reconcileMix();
  }, [
    s.phase,
    s.running,
    s.volume,
    s.duckLevel,
    s.internalMusic,
    s.track,
    externalMusic,
  ]);
  function speak(cue?: Cue, automatic = false) {
    if (!voice.current) return;
    const generation = ++voiceGeneration.current;
    if (!cue || !cueScenes(cue).includes("agradecimiento"))
      gratitudePending.current = false;
    if (cue) lastCue.current = cue.url;
    automaticCue.current = automatic && cue ? cue : null;
    nextVoiceAt.current = Infinity;
    voice.current.pause();
    setSpeaking(cue?.text || "Manolo Lama");
    videoActive.current = false;
    if (current.current.intervention) update({ intervention: "" });
    foreground.current = true;
    reconcileMix();
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
      if (generation !== voiceGeneration.current) return;
      gratitudePending.current = false;
      if (automaticCue.current?.url === cue?.url && cue)
        montagePlayed.current.add(cue.url);
      automaticCue.current = null;
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
            introPeak: m.introPeak || 0,
          });
          if (ownsDesk.current)
            channel.postMessage({ type: "state", state: current.current });
        }
        if (m.type === "notice") note(m.text);
        if (m.type === "intro-ended" && ownsDesk.current) phase("charla");
        if (m.type === "intervention-status" && ownsDesk.current) {
          videoActive.current = m.status === "playing";
          if (["ended", "error", "blocked"].includes(m.status)) {
            update({ intervention: "" });
            nextVoiceAt.current =
              elapsed(current.current) + voiceGap(current.current.voiceGap);
            if (m.status !== "ended")
              note(
                "Vídeo no reproducible: seguimos con la escena y recuperamos la música.",
              );
          }
          reconcileMix();
        }
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
      if (e.source === window && e.data?.type === "ITTT_MUSIC_READY") {
        if (e.data.version >= 2) {
          setBridge(true);
          lastExternal.current = "";
          reconcileMix();
        } else
          note(
            "Actualiza la extensión de música a la versión 2.0 y recarga esta mesa.",
          );
      }
      if (
        e.source === window &&
        e.origin === location.origin &&
        e.data?.type === "ITTT_MUSIC_STATUS"
      )
        setExternalTrack(e.data.track);
    };
    window.addEventListener("message", external);
    window.postMessage({ type: "ITTT_MUSIC_PING" }, location.origin);
    const relinquish = () => {
      if (projection || !ownsDesk.current) return;
      if (localStorage.getItem("ittt-active-desk-v2") === deskId.current)
        return;
      ownsDesk.current = false;
      window.postMessage({ type: "ITTT_MUSIC_RELEASE" }, location.origin);
      voiceGeneration.current++;
      voice.current?.pause();
      music.current?.pause();
      fader.current.close();
      foreground.current = false;
      videoActive.current = false;
      setArmed(false);
      setSpeaking("");
      set((prev) => ({
        ...prev,
        running: false,
        autoVoice: false,
        intervention: "",
      }));
      note(
        "Otra mesa ha tomado el control. Pulsa Activar mesa para recuperarlo.",
      );
    };
    window.addEventListener("storage", relinquish);
    let heartbeat = 0;
    const timer = setInterval(() => {
      tick(Date.now());
      if (!projection && ++heartbeat % 4 === 0)
        window.postMessage({ type: "ITTT_MUSIC_PING" }, location.origin);
      if (projection)
        send({
          type: "ready",
          musicVolume: music.current?.volume,
          voice: voice.current && !voice.current.paused,
          introPeak: introMix.current?.peak() || 0,
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
      window.removeEventListener("storage", relinquish);
      window.removeEventListener("message", external);
      channel.close();
      fader.current.close();
      musicMix.current?.close();
      introMix.current?.close();
      if (!projection && ownsDesk.current)
        window.postMessage(
          { type: "ITTT_MUSIC_ARM", enabled: false },
          location.origin,
        );
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
    if (s.phase === "montaje") montagePlayed.current.clear();
    lastCue.current = "";
    scheduleNextVoice();
  }, [s.phase]);
  useEffect(() => {
    if (voice.current?.paused) scheduleNextVoice();
  }, [s.voiceGap, s.offset, s.autoVoice, s.running, cues]);
  useEffect(() => {
    if (
      projection ||
      !armed ||
      !!s.intervention ||
      !s.autoVoice ||
      !s.running ||
      !["montaje", "ambiente", "llamada", "pizzas"].includes(s.phase) ||
      !voice.current?.paused ||
      t < nextVoiceAt.current
    )
      return;
    if (s.phase === "montaje") {
      const pace = montagePace(cues, montagePlayed.current, new Date(now));
      const cue = pace.remaining.find(
        (candidate) => candidate.end - candidate.start <= pace.secondsLeft,
      );
      if (cue) speak(cue, true);
      else nextVoiceAt.current = Infinity;
    } else {
      const cue = nextCue(cues, s.phase, lastCue.current);
      if (cue) speak(cue, true);
    }
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
        videoActive.current = false;
        if (current.current.intervention) update({ intervention: "" });
        voice.current.pause();
        restore();
      }
    }
  }, [s.running]);
  useEffect(() => {
    if (!projection) return;
    if (intro.current) {
      intro.current.volume = s.voiceVolume;
      if (!introMix.current) {
        introMix.current = new VoiceMix(intro.current);
        introMix.current.setBoost(1);
      }
      void introMix.current.resume().catch(() => {});
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
    if (projection && s.phase !== "intro") {
      introMix.current?.close();
      introMix.current = null;
    }
  }, [s.phase]);
  useEffect(() => {
    if (projection && intro.current && s.phase === "intro")
      intro.current.currentTime = s.offset;
  }, [s.offset, s.phase]);
  useEffect(() => {
    if (!projection && music.current)
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
  useEffect(() => {
    if (projection || !s.intervention) return;
    const timeout = setTimeout(() => {
      videoActive.current = false;
      update({ intervention: "" });
      reconcileMix();
      nextVoiceAt.current =
        elapsed(current.current) + voiceGap(current.current.voiceGap);
    }, 35000);
    return () => clearTimeout(timeout);
  }, [s.intervention]);
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
          void introMix.current?.resume();
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
        {s.intervention && (
          <div className="video-takeover">
            <VideoIntervention
              id={s.intervention}
              volume={s.voiceVolume}
              onState={(status) =>
                send({ type: "intervention-status", status })
              }
            />
            <strong>UNA IDEA PUEDE CAMBIARLO TODO.</strong>
          </div>
        )}
        {(s.phase === "pizzas" || (s.phase === "charla" && t >= 1080)) && (
          <aside className="whatsapp-stage">
            <img src={qr} alt="QR del grupo de WhatsApp" />
            <div>
              <small>LA CONVERSACIÓN SIGUE</small>
              <h2>
                Únete al grupo
                <br />
                de WhatsApp
              </h2>
              <p>Escanea · entra · comparte</p>
            </div>
          </aside>
        )}
      </div>
    );
  function activate() {
    if (!ownsDesk.current) scheduleNextVoice();
    ownsDesk.current = true;
    localStorage.setItem("ittt-active-desk-v2", deskId.current);
    setArmed(true);
    if (voice.current) {
      if (!voiceMix.current) voiceMix.current = new VoiceMix(voice.current);
      void voiceMix.current.resume();
    }
    if (music.current) {
      if (!musicMix.current) {
        musicMix.current = new VoiceMix(music.current);
        musicMix.current.setBoost(1);
      }
      void musicMix.current.resume();
    }
    reconcileMix();
    note("Mesa activada. Automatismos preparados.");
  }
  function stopAll() {
    voice.current?.pause();
    gratitudePending.current = false;
    videoActive.current = false;
    foreground.current = false;
    update({
      intervention: "",
      autoVoice: false,
      internalMusic: false,
      autoCall: false,
    });
    setArmed(false);
    setExternalMusic(false);
    restore();
    window.postMessage(
      { type: "ITTT_MUSIC_ARM", enabled: false },
      location.origin,
    );
  }
  function testVideo() {
    if (!online) {
      note("Abre primero el proyector.");
      return;
    }
    voice.current?.pause();
    restore();
    videoActive.current = false;
    update({
      intervention:
        shorts[Math.floor(Math.random() * Math.min(shorts.length, 20))] || "",
    });
  }
  const phases: [Phase, string][] = [
    ["montaje", "Montaje"],
    ["agradecimiento", "Gracias"],
    ["ambiente", "Ambientillo"],
    ["llamada", "A sentarse"],
    ["salida", "Acelerar"],
    ["intro", "Intro"],
    ["charla", "Charla"],
    ["preguntas", "Preguntas"],
    ["pizzas", "Pizzas"],
  ];
  const montagePlan = montagePace(cues, montagePlayed.current, new Date(now));
  return (
    <div className="dj-console">
      <audio
        ref={voice}
        onEnded={() => {
          const advance = gratitudePending.current;
          gratitudePending.current = false;
          if (automaticCue.current && current.current.phase === "montaje")
            montagePlayed.current.add(automaticCue.current.url);
          automaticCue.current = null;
          restore();
          if (advance) phase("ambiente");
        }}
        onError={() => {
          if (automaticCue.current && current.current.phase === "montaje")
            montagePlayed.current.add(automaticCue.current.url);
          automaticCue.current = null;
          note("No se pudo cargar la voz.");
          restore();
        }}
      />
      <audio ref={music} src={s.track} loop />
      <header className="console-header">
        <a href="?">← Equipo</a>
        <img src="./assets/ittt.png" alt="ITTT" />
        <b>MESA DE DIRECTO</b>
        <span>{online ? "● Proyector conectado" : "○ Sin proyector"}</span>
        <button
          onClick={() => {
            activate();
            win.current = window.open(
              location.pathname + "?projection=1",
              "ittt-projection",
            );
          }}
        >
          Abrir proyector ↗
        </button>
        <button onClick={activate}>
          {armed ? "Audio activado" : "Activar mesa"}
        </button>
        <button className="panic" onClick={stopAll}>
          PARAR TODO
        </button>
      </header>
      <nav className="phase-strip" aria-label="Escena">
        {phases.map(([p, label], i) => (
          <button
            key={p}
            aria-label={label}
            aria-pressed={s.phase === p}
            onClick={() => {
              activate();
              phase(p);
            }}
          >
            <small>{String(i + 1).padStart(2, "0")}</small>
            {label}
          </button>
        ))}
      </nav>
      <main className="console-grid">
        <section className="console-transport">
          <small>EN PANTALLA · {stageLabels[s.phase]}</small>
          <strong>
            {["charla", "preguntas"].includes(s.phase)
              ? fmt(duration - t)
              : madridClock(new Date(now)).time}
          </strong>
          <button
            className="scene-next"
            onClick={() => {
              activate();
              phase(nextStage[s.phase]);
            }}
          >
            {nextText[s.phase]} →
          </button>
          <div className="transport-buttons">
            <button
              onClick={() =>
                update({ running: !s.running, offset: t, started: Date.now() })
              }
            >
              {s.running ? "Pausar" : "Continuar"}
            </button>
            <button
              onClick={() => {
                if (s.phase === "montaje") montagePlayed.current.clear();
                voice.current?.pause();
                restore();
                update({ offset: 0, started: Date.now() });
              }}
            >
              Reiniciar
            </button>
            <button
              onClick={() =>
                update({ offset: Math.max(0, t - 30), started: Date.now() })
              }
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
          <div className="automatic-options">
            <label>
              <input
                type="checkbox"
                checked={s.autoVoice}
                onChange={(e) => update({ autoVoice: e.target.checked })}
              />
              Voces automáticas
            </label>
            <label>
              <input
                type="checkbox"
                checked={s.autoCall}
                onChange={(e) => update({ autoCall: e.target.checked })}
              />
              Sentarse a 3 min del inicio
            </label>
            <label>
              <input
                type="checkbox"
                checked={externalMusic}
                onChange={(e) => setExternalMusic(e.target.checked)}
              />
              Mezclar música externa
            </label>
            <label>
              <input
                type="checkbox"
                checked={s.motion}
                onChange={(e) => update({ motion: e.target.checked })}
              />
              Animaciones
            </label>
          </div>
          <label>
            Inicio programado
            <input
              aria-label="Inicio programado"
              type="datetime-local"
              value={s.scheduled}
              onChange={(e) =>
                update({ scheduled: e.target.value, running: !e.target.value })
              }
            />
          </label>
          <button onClick={() => void share()}>Proyectar mi pantalla</button>
        </section>
        <section className="console-mix">
          <h2>Mezcla única</h2>
          <div
            className={"record " + (externalTrack.playing ? "spinning" : "")}
          >
            <div className="record-grooves" />
            <span>
              {externalTrack.title}
              <small>{externalTrack.artist}</small>
            </span>
          </div>
          <small>
            {bridge
              ? "Extensión conectada"
              : "Conecta la extensión para mezclar Spotify / YouTube Music"}{" "}
            · volumen externo {Math.round(externalTrack.volume * 100)}%
          </small>
          <ChannelMeters
            voice={voiceMix}
            music={musicMix}
            intro={levels.introPeak}
            external={externalTrack.volume}
          />
          <small>
            Señal de la app. La música externa indica volumen, no amplitud.
          </small>
          <label>
            Música local · {Math.round(s.volume * 100)}%
            <input
              aria-label="Volumen de música local"
              type="range"
              min="0"
              max="1"
              step=".01"
              value={s.volume}
              onChange={(e) => update({ volume: Number(e.target.value) })}
            />
          </label>
          <label>
            Voces e intro · {Math.round(s.voiceVolume * 100)}%
            <input
              aria-label="Volumen de voces"
              type="range"
              min="0"
              max="1"
              step=".01"
              value={s.voiceVolume}
              onChange={(e) => update({ voiceVolume: Number(e.target.value) })}
            />
          </label>
          <label>
            Refuerzo de voz · {Math.round(s.voiceBoost * 100)}%
            <input
              aria-label="Refuerzo de voz"
              type="range"
              min=".5"
              max="3"
              step=".1"
              value={s.voiceBoost}
              onChange={(e) => update({ voiceBoost: Number(e.target.value) })}
            />
          </label>
          <label>
            Música bajo la voz · {Math.round(s.duckLevel * 100)}%
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
          <label>
            Canción al sentarse
            <select
              value={s.track}
              onChange={(e) => update({ track: e.target.value })}
            >
              <option value="./media/levels.mp3">Levels · Avicii</option>
              <option value="./media/disco-yes-previa-3min.mp3">
                Disco Yes · previa 3 min
              </option>
              <option value="./media/disco-yes.mp3">
                Disco Yes · completa
              </option>
            </select>
          </label>
          <label>
            <input
              type="checkbox"
              checked={s.internalMusic}
              onChange={(e) => update({ internalMusic: e.target.checked })}
            />
            Canción local activa
          </label>
          <a href="./downloads/thinkglaos-mezclador.zip" download>
            Extensión de música · actualizar
          </a>
        </section>
        <section className="console-voices">
          <h2>Intervenciones</h2>
          <div className="voice-now" role="status">
            {speaking ||
              (s.intervention
                ? "Vídeo en proyección"
                : s.phase === "montaje" && !montagePlan.remaining.length
                  ? "Montaje completo · todas las frases reproducidas"
                  : s.phase === "montaje" && !montagePlan.secondsLeft
                    ? "19:25 · locuciones de montaje finalizadas"
                    : armed && s.autoVoice
                      ? `Siguiente voz en ${fmt(Math.max(0, nextVoiceAt.current - t))}`
                      : "Listo para empezar")}
          </div>
          <div className="transport-buttons">
            <button
              onClick={() => {
                activate();
                const cue =
                  s.phase === "montaje"
                    ? montagePace(cues, montagePlayed.current, new Date())
                        .remaining[0]
                    : nextCue(cues, s.phase, lastCue.current);
                if (cue) speak(cue, s.phase === "montaje");
              }}
            >
              Siguiente voz ▶
            </button>
            <button
              onClick={() => {
                voice.current?.pause();
                gratitudePending.current = false;
                restore();
                update({ intervention: "" });
                videoActive.current = false;
                reconcileMix();
              }}
            >
              Parar intervención
            </button>
            <button
              onClick={() => {
                activate();
                speak();
              }}
            >
              Manolo
            </button>
          </div>
          {s.phase === "montaje" ? (
            <p className="montage-pace" role="status">
              <b>Montaje · hasta las 19:25</b>
              <span>
                {montagePlan.remaining.length} frases pendientes · pausa
                calculada {fmt(montagePlan.gap)}
              </span>
              <small>
                Se reajusta al empezar, pausar o terminar cada locución.
              </small>
            </p>
          ) : (
            <label>
              Pausa entre frases · {s.voiceGap} s
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
          )}
          <div className="video-switch">
            <label>
              <input
                type="checkbox"
                checked={s.videoCues}
                onChange={(e) => {
                  update({ videoCues: e.target.checked, intervention: "" });
                  videoActive.current = false;
                  reconcileMix();
                }}
              />
              Vídeos con voz · prueba
            </label>
            <button
              disabled={!s.videoCues || !shorts.length}
              onClick={testVideo}
            >
              Probar vídeo · máximo 30 s
            </button>
          </div>
          <input
            aria-label="Buscar frase"
            placeholder="Buscar una frase…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
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
          <div className="show-cues">
            {cues
              .filter(
                (c) => bank === "todas" || cueScenes(c).includes(bank as any),
              )
              .filter((c) =>
                c.text.toLocaleLowerCase().includes(query.toLocaleLowerCase()),
              )
              .map((c) => (
                <button
                  key={c.url}
                  aria-pressed={speaking === c.text}
                  onClick={() => {
                    activate();
                    speak(
                      c,
                      s.phase === "montaje" && cueScenes(c).includes("montaje"),
                    );
                  }}
                >
                  <small>
                    {cueScenes(c)
                      .map((p) => voiceSceneLabels[p])
                      .join(" · ")}
                  </small>
                  {c.text}
                </button>
              ))}
          </div>
        </section>
      </main>
      {notice && (
        <p className="console-notice" role="status">
          {notice}
        </p>
      )}
    </div>
  );
}
