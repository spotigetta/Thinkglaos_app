import React, { useEffect, useRef, useState } from "react";
import { VoiceMix } from "./voice-mix";
import {
  BeatDetector,
  VibesDirector,
  vibeStyles,
  selectedVibes,
  proportionalIntensity,
  analyserEnergy,
  analyserSpectrum,
  silentBands,
  type MusicBands,
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
  spectrum() {
    return analyserSpectrum(this.analyser, this.bins, this.context.sampleRate);
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
  trackKey,
}: {
  trackKey?: string;
  settings: VibesSettings;
  onChange: (s: VibesSettings) => void;
  phase: string;
  active: React.RefObject<boolean>;
  music: React.RefObject<HTMLAudioElement | null>;
  mix: React.RefObject<VoiceMix | null>;
  onPulse: (pulse: MusicPulse) => void;
  onActivate: () => void;
}) {
  const latest = useRef({ settings, phase, onPulse, trackKey });
  latest.current = { settings, phase, onPulse, trackKey };
  const capture = useRef<CapturedMusic | null>(null),
    detector = useRef(new BeatDetector()),
    director = useRef(new VibesDirector()),
    sequence = useRef(0),
    previewUntil = useRef(0);
  const [spectrum, setSpectrum] = useState<MusicBands>(silentBands);
  const [level, setLevel] = useState(0),
    [source, setSource] = useState("Música local al sentarse"),
    [connected, setConnected] = useState(false),
    [message, setMessage] = useState("");
  const disconnect = () => {
    capture.current?.close();
    capture.current = null;
    setConnected(false);
    setLevel(0);
    setSpectrum(silentBands);
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
      const bands = local
        ? mix.current?.spectrum() || silentBands
        : capture.current?.spectrum() || silentBands;
      const energy = bands.bass;
      director.current.sample(energy, Date.now());
      if (frame++ % 3 === 0) {
        setLevel(energy);
        setSpectrum(bands);
        setSource(
          local
            ? "Música local en directo"
            : capture.current
              ? "Pestaña musical conectada"
              : "Conecta una pestaña o reproduce música local",
        );
      }
      if (!vibesInScene(settings, phase) || Date.now() < previewUntil.current)
        return;
      const beat = detector.current.sample(
        energy,
        settings.threshold,
        Date.now(),
      );
      const style = director.current.choose(
        settings,
        local
          ? music.current?.currentSrc || "local"
          : latest.current.trackKey || "",
        Date.now(),
      );
      const spectral = style === "halo" || style === "aurora";
      if (beat || (spectral && frame % 4 === 0))
        onPulse({
          id: beat ? ++sequence.current : sequence.current,
          time: Date.now(),
          power: energy,
          style,
          bands,
          ambient: !beat,
          intensity: proportionalIntensity(
            settings.intensity,
            spectral
              ? Math.max(bands.bass, bands.mid, bands.high, bands.air)
              : energy,
            settings.threshold,
          ),
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
          <fieldset className="vibe-palette">
            <legend>Efectos · elige uno o varios</legend>
            <div>
              {vibeStyles.map((effect) => (
                <label key={effect.id}>
                  <input
                    type="checkbox"
                    aria-label={effect.name}
                    checked={selectedVibes(settings).includes(effect.id)}
                    onChange={(e) => {
                      const styles = e.target.checked
                        ? [...selectedVibes(settings), effect.id]
                        : selectedVibes(settings).filter(
                            (s) => s !== effect.id,
                          );
                      if (styles.length)
                        onChange({ ...settings, styles, style: styles[0] });
                    }}
                  />
                  {effect.name}
                </label>
              ))}
            </div>
            <button
              onClick={() =>
                onChange({ ...settings, styles: vibeStyles.map((s) => s.id) })
              }
            >
              Seleccionar todos
            </button>
          </fieldset>
          <label>
            Variación
            <select
              aria-label="Variación de vibes"
              value={settings.rotation}
              onChange={(e) =>
                onChange({
                  ...settings,
                  rotation: e.target.value as VibesSettings["rotation"],
                })
              }
            >
              <option value="musical">Por tramos y energía musical</option>
              <option value="song">Al cambiar de canción</option>
              <option value="minutes">Cada cierto tiempo</option>
              <option value="fixed">Mantener el efecto</option>
            </select>
          </label>
          {settings.rotation === "minutes" && (
            <label>
              Cambiar cada {settings.minutes} min
              <input
                aria-label="Minutos entre efectos"
                type="range"
                min=".25"
                max="15"
                step=".25"
                value={settings.minutes}
                onChange={(e) =>
                  onChange({ ...settings, minutes: Number(e.target.value) })
                }
              />
            </label>
          )}
          <label>
            <input
              type="checkbox"
              checked={settings.text}
              onChange={(e) =>
                onChange({ ...settings, text: e.target.checked })
              }
            />
            Texto al ritmo
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
            Intensidad base · {Math.round(settings.intensity * 100)}% + energía
            <input
              aria-label="Intensidad base de vibes"
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
          <div className="spectral-meters" aria-label="Espectro musical">
            {(
              [
                ["bass", "Graves"],
                ["mid", "Medios"],
                ["high", "Presencia"],
                ["air", "Aire"],
              ] as const
            ).map(([band, label]) => (
              <div key={band}>
                <small>{label}</small>
                <span
                  role="meter"
                  aria-label={"Banda " + label}
                  aria-valuemin={0}
                  aria-valuemax={1}
                  aria-valuenow={spectrum[band]}
                >
                  <i style={{ width: spectrum[band] * 100 + "%" }} />
                </span>
              </div>
            ))}
          </div>
          <small>
            Halos y Aurora: graves expanden · medios desplazan · agudos
            iluminan.
          </small>
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
                previewUntil.current = Date.now() + 1200;
                latest.current.onPulse({
                  id: ++sequence.current,
                  time: Date.now(),
                  power: 1,
                  style: director.current.choose(
                    settings,
                    latest.current.trackKey || "",
                    Date.now(),
                  ),
                  intensity: proportionalIntensity(
                    settings.intensity,
                    1,
                    settings.threshold,
                  ),
                  bands: { bass: 0.85, mid: 0.6, high: 0.7, air: 0.45 },
                  preview: true,
                });
              }}
            >
              Probar pulso
            </button>
          </div>
          <small>
            Para música externa, elige su pestaña y marca Compartir audio. Solo
            bombo y graves de 45–150 Hz. Umbral bajo: más pulsos. La base crece
            con la señal. Los cambios musicales mantienen cada estilo al menos
            20 segundos; estiman tramos, no identifican estribillos.
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
  const visible =
    !!pulse &&
    settings.enabled &&
    !["intro", "pantalla"].includes(phase) &&
    (pulse.preview || vibesInScene(settings, phase)) &&
    Date.now() - pulse.time <= 1600;
  useEffect(() => {
    if (!visible || !pulse || pulse.ambient || !settings.text) return;
    const root = document.querySelector(".show-output");
    const power =
      pulse.intensity ??
      proportionalIntensity(
        settings.intensity,
        pulse.power,
        settings.threshold,
      );
    const animations: Animation[] = [];
    root
      ?.querySelectorAll("main h1, main > p, .scene-side-note > span")
      .forEach((node, index) => {
        const distance = 3 + power * 13;
        const frames =
          pulse.style === "wave" || pulse.style === "rays"
            ? [
                { translate: "0 0", filter: "none" },
                {
                  translate: `${index % 2 ? "-" : ""}${distance}px 0`,
                  filter: "brightness(1.5)",
                },
                { translate: "0 0", filter: "none" },
              ]
            : [
                { scale: "1", filter: "none" },
                {
                  scale: String(1 + power * 0.035),
                  filter:
                    pulse.style === "prism"
                      ? "drop-shadow(5px 0 #b2a3ff) drop-shadow(-5px 0 #fee185)"
                      : "brightness(1.5)",
                },
                { scale: "1", filter: "none" },
              ];
        animations.push(
          node.animate(frames, {
            duration: 420 + power * 240,
            easing: "cubic-bezier(.16,.8,.25,1)",
          }),
        );
      });
    return () => animations.forEach((a) => a.cancel());
  }, [pulse?.id, visible, settings.text]);
  if (
    !pulse ||
    !visible ||
    !settings.enabled ||
    ["intro", "pantalla"].includes(phase) ||
    (!pulse.preview && !vibesInScene(settings, phase)) ||
    Date.now() - pulse.time > 1600
  )
    return null;
  const styles = selectedVibes(settings);
  const style = pulse.style === "mixed" ? styles[0] : pulse.style;
  const intensity =
    pulse.intensity ??
    proportionalIntensity(settings.intensity, pulse.power, settings.threshold);
  return (
    <div
      key={style === "halo" || style === "aurora" ? style : pulse.id}
      className={"music-vibes vibe-" + style}
      data-testid="music-vibes"
      aria-hidden="true"
      style={
        {
          "--vibe-power": intensity,
          "--bass": pulse.bands?.bass || 0,
          "--mid": pulse.bands?.mid || 0,
          "--high": pulse.bands?.high || 0,
          "--air": pulse.bands?.air || 0,
          "--spectral-light": Math.max(
            ...Object.values(pulse.bands || silentBands),
          ),
          "--vibe-flash-duration": `${flashDuration(intensity)}ms`,
          "--vibe-turn": `${(pulse.id * 47) % 360}deg`,
        } as React.CSSProperties
      }
    >
      <i />
      <i />
      <i />
      <i />
      {(style === "halo" || style === "aurora") && (
        <>
          <i />
          <i />
          <i />
          <i />
        </>
      )}
    </div>
  );
}
