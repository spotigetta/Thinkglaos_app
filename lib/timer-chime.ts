/** Original comic fanfare, with a little kazoo, slide whistle and final boing. */
export function playTimerChime(context: AudioContext) {
  void context.resume().then(() => {
    const start = context.currentTime + 0.03;
    const master = context.createGain(),
      limiter = context.createDynamicsCompressor();
    master.gain.value = 0.85;
    limiter.threshold.value = -3;
    limiter.knee.value = 2;
    limiter.ratio.value = 16;
    limiter.attack.value = 0.003;
    limiter.release.value = 0.12;
    master.connect(limiter).connect(context.destination);
    const notes: [number, number, number, number, OscillatorType][] = [
      [0, 523, 523, 0.19, "triangle"],
      [0.22, 659, 659, 0.19, "triangle"],
      [0.44, 784, 1046, 0.34, "triangle"],
      [0.92, 1046, 440, 0.45, "sine"],
      [1.4, 392, 523, 0.22, "square"],
      [1.66, 523, 659, 0.22, "square"],
      [1.92, 784, 1174, 0.28, "triangle"],
      [2.28, 1200, 330, 0.45, "sine"],
      [2.86, 620, 95, 0.74, "triangle"],
    ];
    for (const [at, from, to, length, type] of notes) {
      const oscillator = context.createOscillator(),
        volume = context.createGain(),
        begin = start + at;
      oscillator.type = type;
      oscillator.frequency.setValueAtTime(from, begin);
      oscillator.frequency.exponentialRampToValueAtTime(to, begin + length);
      volume.gain.setValueAtTime(0.0001, begin);
      volume.gain.exponentialRampToValueAtTime(
        type === "square" ? 0.2 : 0.58,
        begin + 0.018,
      );
      volume.gain.setValueAtTime(
        type === "square" ? 0.16 : 0.42,
        begin + length * 0.55,
      );
      volume.gain.exponentialRampToValueAtTime(0.0001, begin + length);
      oscillator.connect(volume).connect(master);
      oscillator.start(begin);
      oscillator.stop(begin + length + 0.02);
    }
    setTimeout(() => {
      master.disconnect();
      limiter.disconnect();
    }, 4200);
  });
}
