// Original instrumental loop, generated locally: no account or external audio needed.
export function montageMusic() {
  const context = new AudioContext();
  const master = context.createGain();
  master.gain.value = 0.18;
  master.connect(context.destination);
  const noise = context.createBuffer(
    1,
    context.sampleRate * 0.15,
    context.sampleRate,
  );
  const samples = noise.getChannelData(0);
  for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1;
  const notes = [130.81, 155.56, 174.61, 196, 130.81, 155.56, 233.08, 196];
  let beat = 0,
    next = context.currentTime + 0.05;
  function tone(
    frequency: number,
    time: number,
    duration: number,
    volume: number,
    type: OscillatorType = "sine",
  ) {
    const oscillator = context.createOscillator(),
      envelope = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, time);
    envelope.gain.setValueAtTime(0.001, time);
    envelope.gain.exponentialRampToValueAtTime(volume, time + 0.015);
    envelope.gain.exponentialRampToValueAtTime(0.001, time + duration);
    oscillator.connect(envelope).connect(master);
    oscillator.start(time);
    oscillator.stop(time + duration + 0.02);
    oscillator.onended = () => {
      oscillator.disconnect();
      envelope.disconnect();
    };
  }
  function schedule() {
    while (next < context.currentTime + 0.15) {
      const note = notes[Math.floor(beat / 2) % notes.length];
      tone(note, next, 0.4, 0.25, "triangle");
      if (beat % 2 === 0) {
        tone(60, next, 0.18, 0.6);
        tone(note * 2, next, 0.9, 0.1);
        tone(note * 3, next, 0.9, 0.045);
      }
      const hat = context.createBufferSource(),
        filter = context.createBiquadFilter(),
        gain = context.createGain();
      hat.buffer = noise;
      filter.type = "highpass";
      filter.frequency.value = 6500;
      gain.gain.setValueAtTime(beat % 2 ? 0.16 : 0.08, next);
      gain.gain.exponentialRampToValueAtTime(0.001, next + 0.08);
      hat.connect(filter).connect(gain).connect(master);
      hat.start(next);
      hat.stop(next + 0.1);
      hat.onended = () => {
        hat.disconnect();
        filter.disconnect();
        gain.disconnect();
      };
      next += 0.3;
      beat++;
    }
  }
  void context.resume();
  const timer = setInterval(schedule, 50);
  schedule();
  return {
    volume(value: number) {
      master.gain.setTargetAtTime(value, context.currentTime, 0.2);
    },
    stop() {
      clearInterval(timer);
      void context.close();
    },
  };
}
