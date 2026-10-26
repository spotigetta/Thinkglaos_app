import { MusicVibesControl, MusicVibesOverlay } from "./MusicVibes";
import {
  defaultVibes,
  readVibes,
  type VibesSettings,
  type MusicPulse,
} from "./music-vibes";
import { mixPolicy, VolumeFader } from "./show-mixer";
import { ChannelMeters, VideoIntervention } from "./ShowChannels";
import React, { useEffect, useRef, useState } from "react";
import { madridClock } from "./event-clock";
import {
  VoiceMix,
  normalizedVoiceUrl,
  clampVoiceBoost,
  introMixLevel,
} from "./voice-mix";
import "./show.css";
import {
  nextCue,
  cueScenes,
  montagePace,
  pizzasPace,
  voiceGap,
  voiceSceneLabels,
  type ShowCue,
} from "./show-voices";
import { KineticText } from "./KineticText";
import { stageLabels, sceneSeconds, visualScene } from "./show-scenes";
import {
  playTimerChime,
  TIMER_MUSIC_SECONDS,
  type TimerMusic,
} from "./timer-chime";
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
  introVolume: number;
  vibes: VibesSettings;
  voiceBoost: number;
  track: string;
  minutes: number;
  scheduled: string;
  autoCall: boolean;
  autoVoice: boolean;
  internalMusic: boolean;
  voiceGap: number;
  motion: boolean;
  counterDark: boolean;
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
  introVolume: 2,
  vibes: defaultVibes,
  voiceBoost: 1.5,
  track: "./media/levels.mp3",
  minutes: 30,
  scheduled: "",
  autoCall: true,
  autoVoice: true,
  internalMusic: false,
  voiceGap: 60,
  motion: true,
  counterDark: false,
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
const communityMessages = [
  "La próxima empieza aquí.",
  "La pizza se acaba. La conversación no.",
  "Cambia de corrillo. Amplía el mundo.",
  "La salsa también está en el grupo.",
  "Tu próxima gran pregunta tiene compañía.",
  "Nos vemos en el siguiente thinkglao.",
  "Una cerveza. Dos ideas. Un nuevo amigo.",
  "No te vayas sin conocer a alguien.",
  "Desliza menos. Conversa más.",
  "Un último trozo. Una primera conversación.",
  "Lo mejor de hoy puede seguir mañana.",
  "Haz sitio. Aquí cabemos todos.",
];
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
            counterDark: p.counterDark === true,
            voiceBoost: clampVoiceBoost(p.voiceBoost),
            introVolume:
              p.introGainVersion === 2 && typeof p.introVolume === "number"
                ? Math.max(0, Math.min(3, p.introVolume))
                : 2,
            vibes: readVibes(
              p.vibesVersion === 2
                ? p.vibes
                : { ...p.vibes, style: "contrast" },
            ),
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
    seen = useRef(new Set<string>()),
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
  const pausedExternal = useRef<number | null>(null);
  const pausedVoice = useRef(false);
  const [armed, setArmed] = useState(false);
  const [vibePulse, setVibePulse] = useState<MusicPulse | null>(null);
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
  const alarmPlayback = useRef<TimerMusic | null>(null);
  const [alarmUntil, setAlarmUntil] = useState(0);
  const nextVoiceAt = useRef(5);
  const montagePlayed = useRef(new Set<string>());
  const pizzasPlayed = useRef(new Set<string>());
  const automaticCue = useRef<Cue | null>(null);
  const cuesRef = useRef<Cue[]>([]);
  const gratitudePending = useRef(false);
  const [bank, setBank] = useState("todas");

  useEffect(() => {
    if (projection) return;
    const header = document.querySelector<HTMLElement>(".console-header");
    if (!header) return;
    const observer = new ResizeObserver(() => {
      header.parentElement?.style.setProperty(
        "--desk-header-height",
        `${header.getBoundingClientRect().height + 12}px`,
      );
    });
    observer.observe(header);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!projection)
      localStorage.setItem(
        "ittt-show-preferences-v1",
        JSON.stringify({
          voiceGap: s.voiceGap,
          motion: s.motion,
          counterDark: s.counterDark,
          voiceBoost: s.voiceBoost,
          introVolume: s.introVolume,
          introGainVersion: 2,
          vibes: s.vibes,
          vibesVersion: 2,
          duckLevel: s.duckLevel,
        }),
      );
  }, [
    s.voiceGap,
    s.motion,
    s.voiceBoost,
    s.duckLevel,
    s.counterDark,
    s.introVolume,
    s.vibes,
  ]);
  current.current = s;
  cuesRef.current = cues;
  const send = (m: { type: string; [key: string]: unknown }) => {
    if (m.type === "reset") seen.current.clear();
    if (m.type === "state" && !projection && !ownsDesk.current) return;
    bus.current?.postMessage(m);
  };
  function update(fields: Partial<State>) {
    if (fields.phase !== undefined || fields.running === true)
      pausedExternal.current = null;
    else if (fields.running === false && current.current.running)
      pausedExternal.current = mixPolicy(
        current.current,
        foreground.current || videoActive.current,
      ).external;
    const next = { ...current.current, ...fields };
    current.current = next;
    set(next);
    send({ type: "state", state: next });
  }
  function stopAlarm() {
    alarmPlayback.current?.stop();
    alarmPlayback.current = null;
    setAlarmUntil(0);
  }
  function soundAlarm() {
    if (!voiceMix.current) return;
    stopAlarm();
    setAlarmUntil(Date.now() + TIMER_MUSIC_SECONDS * 1000);
    alarmPlayback.current = playTimerChime(voiceMix.current.context, () => {
      alarmPlayback.current = null;
      setAlarmUntil(0);
    });
  }
  function phase(p: Phase) {
    if (
      p === current.current.phase &&
      Date.now() - lastPhaseClick.current < 600
    )
      return;
    stopAlarm();
    pausedVoice.current = false;
    lastPhaseClick.current = Date.now();
    if (p === "montaje") montagePlayed.current.clear();
    if (p === "pizzas") pizzasPlayed.current.clear();
    automaticCue.current = null;
    if (p === "llamada" && music.current) music.current.currentTime = 0;
    videoActive.current = false;
    update({ intervention: "" });
    voiceGeneration.current++;
    voice.current?.pause();
    gratitudePending.current = false;
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
    restore();
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
    if (!state.running && pausedExternal.current !== null)
      mix.external = Math.min(mix.external, pausedExternal.current);
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
    const stopPlayback = ["intro", "charla", "preguntas"].includes(state.phase);
    const key = JSON.stringify([
      mix.external,
      mix.ms,
      externalEnabled.current,
      stopPlayback,
    ]);
    if (key !== lastExternal.current) {
      lastExternal.current = key;
      window.postMessage(
        { type: "ITTT_MUSIC_ARM", enabled: externalEnabled.current },
        location.origin,
      );
      if (externalEnabled.current)
        window.postMessage(
          {
            type: "ITTT_MUSIC_TARGET",
            level: mix.external,
            ms: mix.ms,
            stopPlayback,
          },
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
        : state.phase === "pizzas"
          ? (() => {
              const pace = pizzasPace(
                cuesRef.current,
                pizzasPlayed.current,
                elapsed(state),
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
    stopAlarm();
    pausedVoice.current = false;
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
        (current.current.phase === "pizzas"
          ? pizzasPlayed
          : montagePlayed
        ).current.add(cue.url);
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
        if (
          m.type === "music-pulse" &&
          m.pulse &&
          Date.now() - m.pulse.time < 1600
        )
          setVibePulse(m.pulse);
        if (m.type === "state")
          set({
            ...defaults,
            ...m.state,
            motion: m.state.motion ?? defaults.motion,
            voiceGap: voiceGap(m.state.voiceGap),
            voiceBoost: clampVoiceBoost(m.state.voiceBoost),
            vibes: readVibes(m.state.vibes),
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
        if (e.data.version >= 2.2) {
          setBridge(true);
          lastExternal.current = "";
          reconcileMix();
        } else
          note(
            "Actualiza la extensión de música a la versión 2.2 y recarga esta mesa.",
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
      stopAlarm();
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
      alarmPlayback.current?.stop();
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
          : s.phase === "pizzas"
            ? 3600
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
    if (s.phase === "pizzas") pizzasPlayed.current.clear();
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
    } else if (s.phase === "pizzas") {
      const pace = pizzasPace(cues, pizzasPlayed.current, t);
      const cue = pace.remaining.find(
        (c) => c.end - c.start <= pace.secondsLeft,
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
        pausedVoice.current = !voice.current.paused;
        voice.current.pause();
        // Keep the scene's existing music target while the clock is paused.
        reconcileMix();
      } else if (pausedVoice.current) {
        pausedVoice.current = false;
        foreground.current = true;
        reconcileMix();
        void voice.current.play().catch(() => restore());
      }
    }
  }, [s.running]);
  useEffect(() => {
    if (!projection) return;
    if (intro.current) {
      const introLevel = introMixLevel(s.introVolume);
      intro.current.volume = introLevel.volume;
      if (!introMix.current) {
        introMix.current = new VoiceMix(intro.current, -1);
        introMix.current.setBoost(introLevel.boost);
      }
      introMix.current.setBoost(introLevel.boost);
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
    s.introVolume,
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
    if (
      !projection &&
      ["charla", "preguntas"].includes(s.phase) &&
      t >= duration
    ) {
      const alarm = `${s.phase}:${s.started}`;
      if (!seen.current.has(alarm)) {
        seen.current.add(alarm);
        soundAlarm();
      }
      update({ running: false, offset: duration });
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
        data-counter-theme={s.counterDark ? "dark" : "light"}
        className={
          "show-output " +
          s.phase +
          (s.running || (s.phase === "charla" && t >= duration)
            ? ""
            : " scene-paused") +
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
        <MusicVibesOverlay
          settings={s.vibes}
          phase={s.phase}
          pulse={vibePulse}
        />
        {s.phase !== "intro" && (
          <div className="show-brand">
            <img src="./assets/ittt.png" alt="IT’S TIME TO THINK" />
            <span>TOLEDO · EN VIVO</span>
          </div>
        )}
        {!["charla", "preguntas", "intro"].includes(s.phase) && (
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
                ? t >= duration
                  ? "TIEMPO · TÚ DECIDES CUÁNDO SEGUIR"
                  : "18 MINUTOS. UNA IDEA."
                : s.phase === "preguntas"
                  ? t >= duration
                    ? "PREGUNTAS TERMINADAS · SEGUIMOS JUNTOS"
                    : "AHORA, TUS PREGUNTAS."
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
            <p>
              {graphic
                ? scene.copy[2]
                : ["charla", "preguntas"].includes(s.phase)
                  ? t >= duration
                    ? "El contador espera tu señal desde la mesa."
                    : s.running
                      ? "La conversación está en marcha."
                      : "Tiempo en pausa."
                  : ""}
            </p>
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
          <div className="community-scene">
            <section className="qr-live-copy" key={Math.floor(now / 14000)}>
              <small>LA CONVERSACIÓN SIGUE</small>
              <h2>
                <KineticText
                  text={
                    communityMessages[
                      Math.floor(now / 14000) % communityMessages.length
                    ]
                  }
                  effect={Math.floor(now / 14000) % 8}
                />
              </h2>
              <p>
                {s.phase === "pizzas"
                  ? "Coge pizza. Cambia de corrillo. Conoce a alguien."
                  : "Una idea termina. Mil conversaciones empiezan."}
              </p>
              <span className="community-tag">THINK · MEET · REPEAT</span>
            </section>
            <aside className="whatsapp-stage">
              <span className="qr-card-label">
                QUE NO SE QUEDE EN ESTA NOCHE ↗
              </span>
              <img src={qr} alt="QR del grupo de WhatsApp" />
              <h2>Únete al grupo para enterarte de los siguientes.</h2>
              <p>Escanea y entra en la comunidad.</p>
            </aside>
          </div>
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
    pausedVoice.current = false;
    stopAlarm();
    voice.current?.pause();
    gratitudePending.current = false;
    videoActive.current = false;
    foreground.current = false;
    update({
      intervention: "",
      autoVoice: false,
      internalMusic: false,
      autoCall: false,
      vibes: { ...current.current.vibes, enabled: false },
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
  const pizzasPlan = pizzasPace(cues, pizzasPlayed.current, t);
  const timedPhase = ["charla", "preguntas"].includes(s.phase);
  const timerEnded = timedPhase && t >= duration;
  function seekTime(seconds: number) {
    stopAlarm();
    const offset = Math.max(0, Math.min(duration, seconds));
    update({
      offset,
      started: Date.now(),
      running:
        timedPhase && offset === duration ? false : current.current.running,
    });
  }
  return (
    <div className="dj-console">
      <audio
        ref={voice}
        onEnded={() => {
          const advance = gratitudePending.current;
          gratitudePending.current = false;
          if (
            automaticCue.current &&
            ["montaje", "pizzas"].includes(current.current.phase)
          )
            (current.current.phase === "pizzas"
              ? pizzasPlayed
              : montagePlayed
            ).current.add(automaticCue.current.url);
          automaticCue.current = null;
          restore();
          if (advance) phase("ambiente");
        }}
        onError={() => {
          if (
            automaticCue.current &&
            ["montaje", "pizzas"].includes(current.current.phase)
          )
            (current.current.phase === "pizzas"
              ? pizzasPlayed
              : montagePlayed
            ).current.add(automaticCue.current.url);
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
        <a href="#banco-frases" className="jump-to-voices">
          Frases ↓
        </a>
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
        {!!alarmUntil && (
          <button className="alarm-stop" onClick={stopAlarm}>
            Detener aviso ■ · {fmt((alarmUntil - now) / 1000)}
          </button>
        )}
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
          {timedPhase && (
            <p className="timer-state" role="status">
              {timerEnded
                ? "Tiempo terminado · esperando tu señal"
                : s.running
                  ? "Temporizador en marcha"
                  : "Temporizador en pausa"}
            </p>
          )}
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
              disabled={timerEnded}
              onClick={() =>
                update({ running: !s.running, offset: t, started: Date.now() })
              }
            >
              {timerEnded ? "Finalizado" : s.running ? "Pausar" : "Continuar"}
            </button>
            <button
              onClick={() => {
                stopAlarm();
                pausedVoice.current = false;
                if (s.phase === "montaje") montagePlayed.current.clear();
                if (s.phase === "pizzas") pizzasPlayed.current.clear();
                voice.current?.pause();
                restore();
                send({ type: "reset" });
                update({
                  offset: 0,
                  started: Date.now(),
                  running: timedPhase ? false : true,
                });
              }}
            >
              Reiniciar
            </button>
            <button onClick={() => seekTime(t - 30)}>−30 s</button>
            <button onClick={() => seekTime(t + 30)}>+30 s</button>
          </div>
          <label>
            Posición · {fmt(t)}
            <input
              aria-label="Posición de la fase"
              type="range"
              min="0"
              max={duration}
              value={Math.min(duration, t)}
              onChange={(e) => seekTime(Number(e.target.value))}
            />
          </label>
          {timedPhase && !alarmUntil && (
            <button
              className="alarm-preview"
              onClick={() => {
                activate();
                soundAlarm();
              }}
            >
              Probar aviso musical · 30 s ♪
            </button>
          )}
          <label>
            <input
              type="checkbox"
              checked={s.counterDark}
              onChange={(e) => update({ counterDark: e.target.checked })}
            />
            Modo oscuro de cronómetros
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
          <div className="vibes-block">
            <h2>Vibes musicales</h2>
            <MusicVibesControl
              onActivate={activate}
              settings={s.vibes}
              phase={s.phase}
              active={ownsDesk}
              music={music}
              mix={musicMix}
              onChange={(vibes) => update({ vibes })}
              onPulse={(pulse) => send({ type: "music-pulse", pulse })}
            />
          </div>
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
            Voces · {Math.round(s.voiceVolume * 100)}%
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
            Intro · {Math.round(s.introVolume * 100)}%
            <input
              aria-label="Volumen de intro"
              type="range"
              min="0"
              max="3"
              step=".01"
              value={s.introVolume}
              onChange={(e) => update({ introVolume: Number(e.target.value) })}
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
        <section className="console-voices" id="banco-frases">
          <h2>Intervenciones</h2>
          <div className="voice-now" role="status">
            {speaking ||
              (s.intervention
                ? "Vídeo en proyección"
                : s.phase === "montaje" && !montagePlan.remaining.length
                  ? "Montaje completo · todas las frases reproducidas"
                  : s.phase === "pizzas" &&
                      (!pizzasPlan.remaining.length || !pizzasPlan.secondsLeft)
                    ? "Pizzas · locuciones de la hora completadas"
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
                    : s.phase === "pizzas"
                      ? pizzasPace(
                          cues,
                          pizzasPlayed.current,
                          elapsed(current.current),
                        ).remaining[0]
                      : nextCue(cues, s.phase, lastCue.current);
                if (cue) speak(cue, ["montaje", "pizzas"].includes(s.phase));
              }}
            >
              Siguiente voz ▶
            </button>
            <button
              onClick={() => {
                pausedVoice.current = false;
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
          ) : s.phase === "pizzas" ? (
            <p className="montage-pace" role="status">
              <b>Pizzas · una hora</b>
              <span>
                {pizzasPlan.remaining.length} frases pendientes · pausa
                calculada {fmt(pizzasPlan.gap)}
              </span>
              <small>
                Reparto automático durante 60 minutos, sin repetir frases.
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
                      ["montaje", "pizzas"].includes(s.phase) &&
                        cueScenes(c).includes(s.phase as any),
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
