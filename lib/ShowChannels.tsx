import React, { useEffect, useRef, useState } from "react";
import { VoiceMix } from "./voice-mix";
export function Meter({
  label,
  value,
  percent = false,
}: {
  label: string;
  value: number;
  percent?: boolean;
}) {
  const p = Math.max(0, Math.min(1, value));
  return (
    <div
      className="dj-meter"
      role="meter"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={1}
      aria-valuenow={p}
    >
      <span>{label}</span>
      <i>
        <b style={{ width: `${(1 - p) * 100}%` }} />
      </i>
      <small>
        {percent
          ? `${Math.round(p * 100)}%`
          : p > 0
            ? `${Math.round(20 * Math.log10(p))} dB`
            : "−∞"}
      </small>
    </div>
  );
}
export function ChannelMeters({
  voice,
  music,
  intro = 0,
  external = 0,
}: {
  voice: React.RefObject<VoiceMix | null>;
  music: React.RefObject<VoiceMix | null>;
  intro?: number;
  external?: number;
}) {
  const [v, set] = useState([0, 0]);
  useEffect(() => {
    const id = setInterval(
      () => set([voice.current?.peak() || 0, music.current?.peak() || 0]),
      80,
    );
    return () => clearInterval(id);
  }, []);
  return (
    <div className="channel-meters">
      <Meter label="Externa · volumen" value={external} percent />
      <Meter label="Voz · señal" value={v[0]} />
      <Meter label="Música local · señal" value={v[1]} />
      <Meter label="Intro · señal" value={intro} />
      <Meter
        label="Salida app · suma de picos"
        value={Math.min(1, v[0] + v[1] + intro)}
      />
    </div>
  );
}
export function VideoIntervention({
  id,
  onState,
  volume,
}: {
  id: string;
  onState: (state: string) => void;
  volume: number;
}) {
  const node = useRef<HTMLDivElement>(null),
    player = useRef<any>(null),
    callback = useRef(onState);
  callback.current = onState;
  useEffect(() => {
    let closed = false;
    const mount = () => {
      if (closed || !node.current) return;
      const el = document.createElement("div");
      node.current.append(el);
      player.current = new (window as any).YT.Player(el, {
        videoId: id,
        playerVars: {
          autoplay: 1,
          controls: 0,
          playsinline: 1,
          rel: 0,
          origin: location.origin,
        },
        events: {
          onReady: (e: any) => {
            e.target.setVolume(volume * 100);
            e.target.playVideo();
          },
          onStateChange: (e: any) =>
            callback.current(
              e.data === 1 ? "playing" : e.data === 0 ? "ended" : "waiting",
            ),
          onError: () => callback.current("error"),
          onAutoplayBlocked: () => callback.current("blocked"),
        },
      });
    };
    if ((window as any).YT?.Player) mount();
    else {
      const old = (window as any).onYouTubeIframeAPIReady;
      (window as any).onYouTubeIframeAPIReady = () => {
        old?.();
        mount();
      };
      if (!document.querySelector("script[data-ittt-youtube]")) {
        const script = document.createElement("script");
        script.src = "https://www.youtube.com/iframe_api";
        script.dataset.itttYoutube = "1";
        document.head.append(script);
      }
    }
    const timeout = setTimeout(() => callback.current("ended"), 30000);
    return () => {
      closed = true;
      clearTimeout(timeout);
      player.current?.destroy();
    };
  }, [id]);
  useEffect(() => {
    player.current?.setVolume?.(volume * 100);
  }, [volume]);
  return <div className="intervention-video" ref={node} />;
}
