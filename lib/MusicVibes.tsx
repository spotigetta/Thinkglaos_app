import React, { useEffect, useRef, useState } from "react";
import { VoiceMix } from "./voice-mix";
import {
  BeatDetector,
  analyserEnergy,
  bassDecibels,
  vibesInScene,
  flashDuration,
  type VibesSettings,
  type MusicPulse,
} from "./music-vibes";

class CapturedMusic {
  readonly context = new AudioContext();
  private analyser = this.context.createAnalyser();
  private bins = new Float32Array(1024);
  constructor(readonly stream: MediaStream) {
    this.analyser.fftSize = 2048;
    this.analyser.smoothingTimeConstant = 0.25;
    this.context.createMediaStreamSource(stream).connect(this.analyser);
  }
  energy() {
    return analyserEnergy(this.analyser, this.bins, this.context.sampleRate);
  }
  close() {
    this.stream.getTracks().forEach((t) => t.stop());
    if (this.context.state !== "closed") void this.context.close();
  }
}
export function MusicVibesControl({
  settings,
  onChange,
  phase,
  active,
  music,
  mix,
  onPulse,
  onActivate,
}: {
  settings: VibesSettings;
  onChange: (s: VibesSettings) => void;
  phase: string;
  active: React.RefObject<boolean>;
  music: React.RefObject<HTMLAudioElement | null>;
  mix: React.RefObject<VoiceMix | null>;
  onPulse: (pulse: MusicPulse) => void;
  onActivate: () => void;
}) {
  const latest = useRef({ settings, phase, onPulse });
  latest.current = { settings, phase, onPulse };
  const capture = useRef<CapturedMusic | null>(null),
    detector = useRef(new BeatDetector()),
    sequence = useRef(0);
  const [level, setLevel] = useState(0),
    [source, setSource] = useState("Música local al sentarse"),
    [connected, setConnected] = useState(false),
    [message, setMessage] = useState("");
  const disconnect = () => {
    capture.current?.close();
    capture.current = null;
    setConnected(false);
    setLevel(0);
  };
  useEffect(() => {
    if (!settings.enabled) disconnect();
  }, [settings.enabled]);
  useEffect(() => {
    let frame = 0;
    const id = setInterval(() => {
      const { settings, phase, onPulse } = latest.current;
      if (!settings.enabled || !active.current) {
        if (capture.current) disconnect();
        if (frame++ % 3 === 0) setLevel(0);
        return;
      }
      const local =
        music.current && !music.current.paused && music.current.volume > 0.001;
      const energy = local
        ? mix.current?.energy() || 0
        : capture.current?.energy() || 0;
      if (frame++ % 3 === 0) {
        setLevel(energy);
        setSource(
          local
            ? "Música local en directo"
            : capture.current
              ? "Pestaña musical conectada"
              : "Conecta una pestaña o reproduce música local",
        );
      }
      if (
        vibesInScene(settings, phase) &&
        detector.current.sample(energy, settings.threshold, Date.now())
      )
        onPulse({
          id: ++sequence.current,
          time: Date.now(),
          power: energy,
          style: settings.style,
        });
    }, 25);
    return () => {
      clearInterval(id);
      capture.current?.close();
    };
  }, []);
  const connect = async () => {
    onActivate();
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { displaySurface: "browser" },
        audio: true,
        selfBrowserSurface: "exclude",
        systemAudio: "include",
      } as DisplayMediaStreamOptions);
      if (!latest.current.settings.enabled || !active.current) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      if (!stream.getAudioTracks().length) {
        stream.getTracks().forEach((t) => t.stop());
        setMessage("Selecciona la pestaña musical y activa Compartir audio.");
        return;
      }
      disconnect();
      const next = new CapturedMusic(stream);
      capture.current = next;
      await next.context.resume();
      setConnected(true);
      setMessage("Audio conectado para los efectos.");
      stream
        .getTracks()
        .forEach((t) =>
          t.addEventListener("ended", disconnect, { once: true }),
        );
    } catch {
      disconnect();
      setMessage(
        "Conexión cancelada. Puedes volver a elegir la pestaña musical.",
      );
    }
  };
  return (
    <div className="vibes-controls">
      <label className="vibes-toggle">
        <input
          type="checkbox"
          checked={settings.enabled}
          onChange={(e) => onChange({ ...settings, enabled: e.target.checked })}
        />
        Vibes al ritmo de la música
      </label>
      {settings.enabled && (
        <>
          <label>
            Escenas
            <select
              aria-label="Escenas de vibes"
              value={settings.scope}
              onChange={(e) =>
                onChange({
                  ...settings,
                  scope: e.target.value as VibesSettings["scope"],
                })
              }
            >
              <option value="llamada">A sentarse y aceleración</option>
              <option value="previo">Montaje y todo el previo</option>
              <option value="pizzas">Pizzas</option>
              <option value="counters">Cronómetros</option>
              <option value="all">Todas las escenas salvo intro</option>
            </select>
          </label>
          <label>
            Estilo
            <select
              aria-label="Estilo de vibes"
              value={settings.style}
              onChange={(e) =>
                onChange({
                  ...settings,
                  style: e.target.value as VibesSettings["style"],
                })
              }
            >
              <option value="mixed">Mezcla de estilos</option>
              <option value="halo">Halos de color</option>
              <option value="contrast">Flash · inversión total</option>
              <option value="shapes">Anillos y figuras</option>
              <option value="wave">Ondas deslizantes</option>
            </select>
          </label>
          <label>
            Umbral de graves · {bassDecibels(settings.threshold)} dB
            <input
              aria-label="Umbral de graves"
              type="range"
              min=".02"
              max="1"
              step=".01"
              value={settings.threshold}
              onChange={(e) =>
                onChange({ ...settings, threshold: Number(e.target.value) })
              }
            />
          </label>
          <label>
            {settings.style === "contrast"
              ? `Duración del flash · ${flashDuration(settings.intensity)} ms`
              : `Intensidad · ${Math.round(settings.intensity * 100)}%`}
            <input
              aria-label={
                settings.style === "contrast"
                  ? "Duración del flash"
                  : "Intensidad de vibes"
              }
              type="range"
              min=".02"
              max="1"
              step=".01"
              value={settings.intensity}
              onChange={(e) =>
                onChange({ ...settings, intensity: Number(e.target.value) })
              }
            />
          </label>
          <div
            className="vibes-signal"
            role="meter"
            aria-label="Señal de graves (45–150 Hz)"
            aria-valuemin={0}
            aria-valuemax={1}
            aria-valuenow={level}
          >
            <i style={{ width: `${level * 100}%` }} />
            <b style={{ left: `${settings.threshold * 100}%` }} />
          </div>
          <small>{source}</small>
          <div className="transport-buttons">
            <button onClick={connected ? disconnect : () => void connect()}>
              {connected
                ? "Desconectar pestaña musical"
                : "Conectar audio de YouTube / Spotify"}
            </button>
            <button
              onClick={() => {
                onActivate();
                latest.current.onPulse({
                  id: ++sequence.current,
                  time: Date.now(),
                  power: 1,
                  style: settings.style,
                  preview: true,
                });
              }}
            >
              Probar pulso
            </button>
          </div>
          <small>
            Para música externa, elige su pestaña y marca Compartir audio. Solo
            bombo y graves de 45–150 Hz. Umbral bajo: más pulsos.
          </small>
          {message && <small role="status">{message}</small>}
        </>
      )}
    </div>
  );
}
export function MusicVibesOverlay({
  settings,
  phase,
  pulse,
}: {
  settings: VibesSettings;
  phase: string;
  pulse: MusicPulse | null;
}) {
  if (
    !pulse ||
    !settings.enabled ||
    ["intro", "pantalla"].includes(phase) ||
    (!pulse.preview && !vibesInScene(settings, phase)) ||
    Date.now() - pulse.time > 1600
  )
    return null;
  const styles = ["halo", "contrast", "shapes", "wave"];
  const style =
    pulse.style === "mixed" ? styles[pulse.id % styles.length] : pulse.style;
  return (
    <div
      key={pulse.id}
      className={"music-vibes vibe-" + style}
      data-testid="music-vibes"
      aria-hidden="true"
      style={
        {
          "--vibe-power": settings.intensity,
          "--vibe-flash-duration": `${flashDuration(settings.intensity)}ms`,
          "--vibe-turn": `${(pulse.id * 47) % 360}deg`,
        } as React.CSSProperties
      }
    >
      <i />
      <i />
      <i />
      <i />
    </div>
  );
}
