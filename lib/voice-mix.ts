import { analyserEnergy, analyserSpectrum } from "./music-vibes";

export function normalizedVoiceUrl(source: string) {
  return "./media/voces-master-v1/" + source.split("/").pop();
}

export function clampVoiceBoost(value: number) {
  return Math.max(0.5, Math.min(3, Number.isFinite(value) ? value : 1.5));
}

/** A single graph per audio element: extra gain with peak protection and a real meter. */
export class VoiceMix {
  readonly context = new AudioContext();
  private gain = this.context.createGain();
  private limiter = this.context.createDynamicsCompressor();
  private analyser = this.context.createAnalyser();
  private samples = new Float32Array(2048);
  private bins = new Float32Array(1024);

  constructor(audio: HTMLMediaElement, ceilingDB = -5) {
    const source = this.context.createMediaElementSource(audio);
    this.limiter.threshold.value = ceilingDB;
    this.limiter.knee.value = 0;
    this.limiter.ratio.value = 20;
    this.limiter.attack.value = 0.003;
    this.limiter.release.value = 0.15;
    this.analyser.fftSize = 2048;
    this.analyser.smoothingTimeConstant = 0.25;
    source
      .connect(this.gain)
      .connect(this.limiter)
      .connect(this.analyser)
      .connect(this.context.destination);
  }

  setBoost(value: number) {
    this.gain.gain.setTargetAtTime(
      clampVoiceBoost(value),
      this.context.currentTime,
      0.035,
    );
  }

  resume() {
    return this.context.resume();
  }

  peak() {
    this.analyser.getFloatTimeDomainData(this.samples);
    return this.samples.reduce(
      (peak, value) => Math.max(peak, Math.abs(value)),
      0,
    );
  }

  energy() {
    return analyserEnergy(this.analyser, this.bins, this.context.sampleRate);
  }

  spectrum() {
    return analyserSpectrum(this.analyser, this.bins, this.context.sampleRate);
  }

  close() {
    void this.context.close();
  }
}

export function introMixLevel(value: number) {
  const level = Math.max(0, Math.min(3, Number.isFinite(value) ? value : 2));
  return { volume: Math.min(1, level), boost: Math.max(1, level) };
}
