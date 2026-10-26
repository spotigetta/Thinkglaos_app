export const TIMER_MUSIC_SECONDS = 30;
export type TimerMusic = { stop(): void };

/** Original music-box waltz: 20 bars at 120 bpm, with a playful slide at the end. */
export function playTimerChime(
  context: AudioContext,
  onFinished: () => void = () => {},
): TimerMusic {
  const master = context.createGain(),
    limiter = context.createDynamicsCompressor();
  const sources: OscillatorNode[] = [];
  let stopped = false,
    finished = false;
  let timeout: ReturnType<typeof setTimeout> | undefined;
  master.gain.value = 0.72;
  limiter.threshold.value = -3;
  limiter.knee.value = 3;
  limiter.ratio.value = 18;
  limiter.attack.value = 0.003;
  limiter.release.value = 0.14;
  master.connect(limiter).connect(context.destination);
  const finish = () => {
    if (finished) return;
    finished = true;
    clearTimeout(timeout);
    onFinished();
  };
  const note = (
    start: number,
    midi: number,
    duration: number,
    gain: number,
    type: OscillatorType = "sine",
    slide?: number,
  ) => {
    const oscillator = context.createOscillator(),
      envelope = context.createGain();
    sources.push(oscillator);
    oscillator.type = type;
    const frequency = 440 * 2 ** ((midi - 69) / 12);
    oscillator.frequency.setValueAtTime(frequency, start);
    if (slide)
      oscillator.frequency.exponentialRampToValueAtTime(
        slide,
        start + duration,
      );
    envelope.gain.setValueAtTime(0.0001, start);
    envelope.gain.exponentialRampToValueAtTime(gain, start + 0.012);
    envelope.gain.exponentialRampToValueAtTime(
      gain * 0.34,
      start + duration * 0.6,
    );
    envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(envelope).connect(master);
    oscillator.start(start);
    oscillator.stop(start + duration);
    oscillator.onended = () => {
      oscillator.disconnect();
      envelope.disconnect();
    };
  };
  void context
    .resume()
    .then(() => {
      if (stopped) return;
      const begin = context.currentTime + 0.025;
      // A deliberately original, light melody; each row is a three-beat bar.
      const melody = [
        [76, 79, 83, 81, 79, 76],
        [74, 78, 81, 79, 78, 74],
        [72, 76, 79, 83, 81, 79],
        [71, 74, 78, 79, 78, 74],
        [76, 83, 81, 79, 76, 79],
        [78, 81, 86, 84, 81, 78],
        [79, 76, 72, 76, 79, 81],
        [83, 81, 79, 78, 74, 71],
        [84, 83, 79, 81, 83, 79],
        [81, 78, 74, 78, 81, 86],
        [79, 83, 84, 83, 79, 76],
        [78, 74, 71, 74, 78, 81],
        [76, 79, 88, 86, 83, 79],
        [78, 81, 86, 81, 78, 74],
        [79, 84, 83, 79, 76, 72],
        [74, 78, 83, 81, 78, 74],
        [83, 79, 76, 79, 83, 86],
        [84, 81, 78, 81, 84, 86],
        [83, 79, 76, 74, 72, 71],
        [72, 76, 79, 84, 83, 84],
      ];
      const chords = [
        [48, 55, 60, 64],
        [50, 57, 62, 66],
        [53, 60, 65, 69],
        [55, 62, 67, 71],
      ];
      melody.forEach((bar, index) => {
        const base = begin + index * 1.5;
        bar.forEach((pitch, step) =>
          note(
            base + step * 0.25,
            pitch,
            0.235,
            0.38,
            index % 4 === 3 ? "triangle" : "sine",
          ),
        );
        const chord = chords[index % chords.length];
        note(base, chord[0], 0.44, 0.3, "triangle");
        for (const beat of [0.5, 1])
          for (const pitch of chord.slice(1))
            note(base + beat, pitch, 0.34, 0.095, "triangle");
      });
      // A final soft, comic "boing" inside the last half second.
      note(begin + 29.5, 79, 0.48, 0.35, "triangle", 130);
      timeout = setTimeout(
        () => {
          master.disconnect();
          limiter.disconnect();
          finish();
        },
        (TIMER_MUSIC_SECONDS + 0.08) * 1000,
      );
    })
    .catch(() => {
      master.disconnect();
      limiter.disconnect();
      finish();
    });
  return {
    stop() {
      if (stopped || finished) return;
      stopped = true;
      const at = context.currentTime;
      master.gain.cancelScheduledValues(at);
      master.gain.setTargetAtTime(0, at, 0.02);
      for (const source of sources) {
        try {
          source.stop(at + 0.08);
        } catch {}
      }
      finish();
      setTimeout(() => {
        master.disconnect();
        limiter.disconnect();
      }, 120);
    },
  };
}
