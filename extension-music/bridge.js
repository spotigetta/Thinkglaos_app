let armed = false,
  lastTarget = 1,
  lastStop = false,
  announced = false,
  revision = Date.now();
const nextRevision = () => (revision = Math.max(revision + 1, Date.now()));
window.addEventListener("message", (event) => {
  if (event.source !== window || event.origin !== location.origin) return;
  const type = event.data?.type;
  if (
    [
      "ITTT_SPECTRUM_SUBSCRIBE",
      "ITTT_SPECTRUM_STOP",
      "ITTT_SPECTRUM_GUIDE",
      "ITTT_PROJECTOR_PLACE",
    ].includes(type)
  ) {
    chrome.runtime
      .sendMessage({ type })
      .then((result) =>
        window.postMessage(
          { type: type + "_RESULT", ...result },
          location.origin,
        ),
      )
      .catch(() => {});
    return;
  }
  if (type === "ITTT_MUSIC_RELEASE") {
    armed = false;
    return;
  }
  if (type === "ITTT_MUSIC_ARM") {
    if (armed && !event.data.enabled) {
      lastTarget = 1;
      lastStop = false;
      chrome.runtime
        .sendMessage({
          level: 1,
          ms: 1400,
          stopPlayback: false,
          revision: nextRevision(),
        })
        .catch(() => {});
    }
    armed = event.data.enabled === true;
    return;
  }
  if (type === "ITTT_MUSIC_PING") {
    if (armed && lastTarget < 1)
      chrome.runtime
        .sendMessage({
          level: lastTarget,
          stopPlayback: lastStop,
          ms: lastTarget === 0 ? 250 : 1000,
          revision: nextRevision(),
        })
        .catch(() => {});
    if (!announced) {
      announced = true;
      window.postMessage(
        { type: "ITTT_MUSIC_READY", version: 2.3 },
        location.origin,
      );
    }
    chrome.runtime
      .sendMessage({ status: true })
      .then((track) => {
        if (track)
          window.postMessage(
            { type: "ITTT_MUSIC_STATUS", track },
            location.origin,
          );
      })
      .catch(() => {});
  }
  if (armed && type === "ITTT_MUSIC_TARGET") {
    lastTarget = event.data.level;
    lastStop = event.data.stopPlayback === true;
    chrome.runtime
      .sendMessage({
        level: lastTarget,
        stopPlayback: lastStop,
        ms: event.data.ms,
        revision: nextRevision(),
      })
      .catch(() => {});
  }
});
window.postMessage({ type: "ITTT_MUSIC_READY", version: 2.3 }, location.origin);
window.addEventListener("pagehide", () => {
  if (armed)
    chrome.runtime
      .sendMessage({
        level: 1,
        ms: 1000,
        stopPlayback: false,
        revision: nextRevision(),
      })
      .catch(() => {});
});

chrome.runtime.onMessage.addListener((message) => {
  if (message.type === "STAGE_SPECTRUM_FRAME")
    window.postMessage(
      { type: "ITTT_SPECTRUM_FRAME", bands: message.bands },
      location.origin,
    );
});
