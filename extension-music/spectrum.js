let stream, context, timer, gate;
function stopSpectrum() {
  clearInterval(timer);
  stream?.getTracks().forEach((t) => t.stop());
  stream = null;
  if (context?.state !== "closed") void context?.close();
  context = null;
}
function readBands(analyser, bins, sampleRate) {
  analyser.getFloatFrequencyData(bins);
  const band = (low, high) => {
    let power = 0,
      count = 0;
    for (
      let i = Math.max(1, Math.ceil((low * analyser.fftSize) / sampleRate));
      i <
      Math.min(bins.length, Math.ceil((high * analyser.fftSize) / sampleRate));
      i++
    ) {
      count++;
      if (Number.isFinite(bins[i])) power += 10 ** (bins[i] / 10);
    }
    return power && count
      ? Math.max(0, Math.min(1, (10 * Math.log10(power / count) + 60) / 60))
      : 0;
  };
  return {
    bass: band(45, 150),
    mid: band(150, 900),
    high: band(900, 4000),
    air: band(4000, 12000),
  };
}
chrome.runtime.onMessage.addListener((message, sender, respond) => {
  if (message.target !== "spectrum" || sender.id !== chrome.runtime.id) return;
  if (message.type === "STAGE_SPECTRUM_STOP") {
    stopSpectrum();
    respond({ ok: true });
    return;
  }
  if (message.type === "STAGE_AUDIO_GATE") {
    if (gate && context)
      gate.gain.setTargetAtTime(
        message.blocked ? 0 : 1,
        context.currentTime,
        0.03,
      );
    return;
  }
  if (message.type !== "STAGE_SPECTRUM_START") return;
  (async () => {
    stopSpectrum();
    stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        mandatory: {
          chromeMediaSource: "tab",
          chromeMediaSourceId: message.streamId,
        },
      },
      video: false,
    });
    context = new AudioContext();
    const source = context.createMediaStreamSource(stream),
      analyser = context.createAnalyser(),
      bins = new Float32Array(1024);
    analyser.fftSize = 2048;
    analyser.smoothingTimeConstant = 0.25;
    gate = context.createGain();
    gate.gain.value = message.blocked ? 0 : 1;
    // tabCapture reroutes audio: reconnect it once, at unity, to keep the music audible.
    source.connect(gate).connect(context.destination);
    source.connect(analyser);
    await context.resume();
    timer = setInterval(
      () =>
        void chrome.runtime
          .sendMessage({
            type: "STAGE_SPECTRUM_FRAME",
            bands: readBands(analyser, bins, context.sampleRate),
          })
          .catch(() => {}),
      75,
    );
    stream
      .getTracks()
      .forEach((t) =>
        t.addEventListener("ended", stopSpectrum, { once: true }),
      );
    respond({ ok: true });
  })().catch((error) => {
    stopSpectrum();
    respond({ error: error.message });
  });
  return true;
});
