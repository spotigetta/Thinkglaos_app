/** Short original cartoon cue: two chirps and a soft falling "boing". */
export function playTimerChime(context: AudioContext) {
  void context.resume().then(() => {
    const start = context.currentTime + 0.03;
    const notes = [
      { at: 0, from: 660, to: 880, length: 0.14, type: "sine" as const },
      { at: 0.22, from: 740, to: 990, length: 0.14, type: "sine" as const },
      { at: 0.5, from: 880, to: 390, length: 0.46, type: "triangle" as const },
      { at: 1.13, from: 530, to: 790, length: 0.16, type: "sine" as const },
      { at: 1.36, from: 740, to: 300, length: 0.49, type: "triangle" as const },
    ];
    for (const note of notes) {
      const oscillator = context.createOscillator();
      const volume = context.createGain();
      const begin = start + note.at;
      oscillator.type = note.type;
      oscillator.frequency.setValueAtTime(note.from, begin);
      oscillator.frequency.exponentialRampToValueAtTime(
        note.to,
        begin + note.length,
      );
      volume.gain.setValueAtTime(0.0001, begin);
      volume.gain.exponentialRampToValueAtTime(0.17, begin + 0.018);
      volume.gain.exponentialRampToValueAtTime(0.0001, begin + note.length);
      oscillator.connect(volume).connect(context.destination);
      oscillator.start(begin);
      oscillator.stop(begin + note.length + 0.02);
    }
  });
}
