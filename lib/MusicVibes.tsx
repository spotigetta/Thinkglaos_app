import React, { useEffect, useRef, useState } from "react";
import { VoiceMix } from "./voice-mix";
import {
  BeatDetector,
  SpectralAccentDetector,
  VibesDirector,
  musicalSectionLabels,
  type DirectorStatus,
  vibeStyles,
  selectedVibes,
  proportionalIntensity,
  silentBands,
  type MusicBands,
  bassDecibels,
  vibesInScene,
  flashDuration,
  type VibesSettings,
  type MusicPulse,
} from "./music-vibes";

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
  const detector = useRef(new BeatDetector()),
    accents = useRef(new SpectralAccentDetector()),
    director = useRef(new VibesDirector()),
    sequence = useRef(0),
    previewUntil = useRef(0),
    extensionBands = useRef<MusicBands>(silentBands),
    extensionAt = useRef(0),
    extensionReady = useRef(false),
    externalListening = useRef(false);
  const [nativeAudio, setNativeAudio] = useState(false);
  const [direction, setDirection] = useState<DirectorStatus>(() =>
    director.current.status(),
  );
  const [spectrum, setSpectrum] = useState<MusicBands>(silentBands);
  const [level, setLevel] = useState(0),
    [source, setSource] = useState("Música local al sentarse"),
    [connected, setConnected] = useState(false),
    [message, setMessage] = useState("");
  const disconnect = () => {
    externalListening.current = false;
    extensionAt.current = 0;
    if (extensionReady.current)
      window.postMessage({ type: "ITTT_SPECTRUM_STOP" }, location.origin);
    setConnected(false);
    setLevel(0);
    setSpectrum(silentBands);
  };
  useEffect(() => {
    if (!settings.enabled) disconnect();
  }, [settings.enabled]);
  useEffect(() => {
    const receive = (event: MessageEvent) => {
      if (event.source !== window || event.origin !== location.origin) return;
      if (
        event.data?.type === "ITTT_MUSIC_READY" &&
        event.data.version >= 2.3
      ) {
        extensionReady.current = true;
        setNativeAudio(true);
      }
      if (event.data?.type === "ITTT_SPECTRUM_GUIDE_RESULT" && event.data.error)
        setMessage(event.data.error);
      if (
        event.data?.type !== "ITTT_SPECTRUM_FRAME" ||
        !latest.current.settings.enabled ||
        !externalListening.current ||
        !active.current
      )
        return;
      const raw = event.data.bands;
      if (
        !raw ||
        !["bass", "mid", "high", "air"].every(
          (k) =>
            typeof raw[k] === "number" &&
            Number.isFinite(raw[k]) &&
            raw[k] >= 0 &&
            raw[k] <= 1,
        )
      )
        return;
      extensionBands.current = {
        bass: raw.bass,
        mid: raw.mid,
        high: raw.high,
        air: raw.air,
      };
      extensionAt.current = Date.now();
      setConnected(true);
    };
    window.addEventListener("message", receive);
    window.postMessage({ type: "ITTT_MUSIC_PING" }, location.origin);
    return () => window.removeEventListener("message", receive);
  }, []);
  useEffect(() => {
    if (!settings.enabled || !nativeAudio) return;
    externalListening.current = true;
    const subscribe = () => {
      if (active.current && externalListening.current)
        window.postMessage(
          { type: "ITTT_SPECTRUM_SUBSCRIBE" },
          location.origin,
        );
    };
    subscribe();
    const id = setInterval(subscribe, 2000);
    return () => {
      clearInterval(id);
      window.postMessage({ type: "ITTT_SPECTRUM_STOP" }, location.origin);
    };
  }, [settings.enabled, nativeAudio]);
  useEffect(() => {
    let frame = 0;
    const id = setInterval(() => {
      const { settings, phase, onPulse } = latest.current;
      if (!settings.enabled || !active.current) {
        if (frame++ % 3 === 0) setLevel(0);
        return;
      }
      const local =
        music.current && !music.current.paused && music.current.volume > 0.001;
      const externalNative = Date.now() - extensionAt.current < 1500;
      const bands = local
        ? mix.current?.spectrum() || silentBands
        : externalNative
          ? extensionBands.current
          : silentBands;
      const energy = bands.bass;
      const stamp = Date.now();
      const beat = detector.current.sample(energy, settings.threshold, stamp);
      director.current.sample(bands, stamp, beat);
      const style = director.current.choose(
        settings,
        local
          ? music.current?.currentSrc || "local"
          : latest.current.trackKey || "",
        stamp,
      );
      if (frame++ % 3 === 0) {
        setLevel(energy);
        setSpectrum(bands);
        setDirection(director.current.status());
        setSource(
          local
            ? "Música local en directo"
            : externalNative
              ? "Audio directo de la extensión · sin compartir pantalla"
              : "Conecta el audio directo o reproduce música local",
        );
      }
      if (!vibesInScene(settings, phase) || Date.now() < previewUntil.current)
        return;
      const highAccent = accents.current.sample(
        bands,
        beat,
        settings.threshold,
        director.current.status().bpm,
        stamp,
      );
      const accent = beat ? "bass" : highAccent;
      const accentStyle = accent
        ? director.current.accentStyle(settings, accent)
        : null;
      const spectral = style === "halo" || style === "aurora";
      if ((accent && accentStyle) || (spectral && frame % 4 === 0))
        onPulse({
          id: accent && accentStyle ? ++sequence.current : sequence.current,
          time: Date.now(),
          power: energy,
          style: accentStyle || style,
          baseStyle: style,
          accent: accent || undefined,
          bands,
          ambient: !(accent && accentStyle),
          intensity: proportionalIntensity(
            settings.intensity,
            spectral
              ? Math.max(bands.bass, bands.mid, bands.high, bands.air)
              : accent === "bass"
                ? energy
                : Math.max(bands.high, bands.air),
            settings.threshold,
          ),
        });
    }, 25);
    return () => {
      clearInterval(id);
    };
  }, []);
  const connect = () => {
    onActivate();
    if (!extensionReady.current) {
      setMessage(
        "No se detecta la extensión 2.3. Carga la carpeta extension-music como descomprimida en edge://extensions y recarga la mesa. Este botón ya no comparte pantalla.",
      );
      return;
    }
    externalListening.current = true;
    window.postMessage({ type: "ITTT_SPECTRUM_SUBSCRIBE" }, location.origin);
    window.postMessage({ type: "ITTT_SPECTRUM_GUIDE" }, location.origin);
    setMessage(
      "En YouTube Music o Spotify, pulsa el icono ITTT de la extensión. Debe indicar ON. No uses Compartir pantalla.",
    );
  };

  return (
    <div className="vibes-controls">
      <label className="vibes-toggle">
        <input
          type="checkbox"
          checked={settings.enabled}
          onChange={(e) => {
            if (e.target.checked) onActivate();
            onChange({ ...settings, enabled: e.target.checked });
          }}
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
              <option value="musical">Dirección musical inteligente</option>
              <option value="song">Al cambiar de canción</option>
              <option value="minutes">Cada cierto tiempo</option>
              <option value="fixed">Mantener el efecto</option>
            </select>
          </label>
          {settings.rotation === "musical" && (
            <div className="vibes-director" data-testid="vibes-director">
              <b>
                {musicalSectionLabels[direction.section]} ·{" "}
                {vibeStyles.find((s) => s.id === direction.style)?.name ||
                  "Escuchando"}
              </b>
              <span>
                {direction.bpm
                  ? "≈ " + direction.bpm + " BPM · cambios sobre el pulso"
                  : "Midiendo estructura y bandas"}
              </span>
              <small>{direction.reason}</small>
              <small>
                Bajo:{" "}
                {vibeStyles.find(
                  (s) =>
                    s.id === director.current.accentStyle(settings, "bass"),
                )?.name || "Sin acento"}{" "}
                · Contratiempo:{" "}
                {vibeStyles.find(
                  (s) =>
                    s.id === director.current.accentStyle(settings, "upbeat"),
                )?.name || "Sin acento"}
              </small>
            </div>
          )}
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
                    music.current &&
                      !music.current.paused &&
                      music.current.volume > 0.001
                      ? music.current.currentSrc || "local"
                      : latest.current.trackKey || "",
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
          {nativeAudio && (
            <small>
              Extensión 2.3 detectada. Audio sin barra: activa las vibes y pulsa
              la extensión desde la pestaña de YouTube Music o Spotify. Detén
              antes la pantalla compartida que tenías abierta.
            </small>
          )}
          {!nativeAudio && (
            <small>
              Extensión de audio directo no detectada. Necesitas la versión 2.3;
              la música local sí funciona.
            </small>
          )}
          <small>
            Los flashes siguen el bombo de 45–150 Hz; la dirección usa las
            cuatro bandas. Umbral bajo: más pulsos. La base crece con la señal.
            La dirección estima subidas, picos y descansos; usa el ritmo cuando
            es fiable y recupera motivos en tramos parecidos. No identifica
            estribillos por su letra.
          </small>
          <a href="./downloads/thinkglaos-mezclador.zip" download>
            Descargar extensión de audio directo 2.3
          </a>
          {message && <small role="status">{message}</small>}
        </>
      )}
    </div>
  );
}
function MusicVibesLayer({
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
      data-accent={pulse.ambient ? "background" : pulse.accent || "bass"}
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

export function MusicVibesOverlay(props: {
  settings: VibesSettings;
  phase: string;
  pulse: MusicPulse | null;
}) {
  const [hits, setHits] = useState<{
    bass: MusicPulse | null;
    treble: MusicPulse | null;
  }>({ bass: null, treble: null });
  useEffect(() => {
    if (props.pulse && !props.pulse.ambient) {
      const pulse = props.pulse;
      setHits((old) => ({
        ...old,
        [pulse.accent && pulse.accent !== "bass" ? "treble" : "bass"]: pulse,
      }));
    }
  }, [props.pulse]);
  const incoming = props.pulse;
  const bedStyle =
    incoming?.baseStyle || (incoming?.ambient ? incoming.style : undefined);
  const bed =
    bedStyle === "halo" || bedStyle === "aurora"
      ? {
          ...incoming!,
          style: bedStyle,
          ambient: incoming!.ambient || incoming!.style !== bedStyle,
        }
      : null;
  const visibleHits = [hits.bass, hits.treble].filter(
    (hit): hit is MusicPulse =>
      !!hit &&
      selectedVibes(props.settings).includes(
        hit.style as Exclude<typeof hit.style, "mixed">,
      ) &&
      (!bed || hit.style !== bedStyle) &&
      Date.now() - hit.time < 1600,
  );
  return (
    <>
      {bed && <MusicVibesLayer {...props} pulse={bed} />}
      {visibleHits.map((hit) => (
        <MusicVibesLayer
          key={hit.accent && hit.accent !== "bass" ? "treble" : "bass"}
          {...props}
          pulse={hit}
        />
      ))}
    </>
  );
}
