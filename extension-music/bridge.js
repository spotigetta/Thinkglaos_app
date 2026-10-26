let armed = false,
  lastTarget = 1,
  announced = false;
window.addEventListener("message", (event) => {
  if (event.source !== window || event.origin !== location.origin) return;
  const type = event.data?.type;
  if (type === "ITTT_MUSIC_RELEASE") {
    armed = false;
    return;
  }
  if (type === "ITTT_MUSIC_ARM") {
    if (armed && !event.data.enabled) {
      lastTarget = 1;
      chrome.runtime.sendMessage({ level: 1, ms: 1400 }).catch(() => {});
    }
    armed = event.data.enabled === true;
    return;
  }
  if (type === "ITTT_MUSIC_PING") {
    if (!announced) {
      announced = true;
      window.postMessage(
        { type: "ITTT_MUSIC_READY", version: 2 },
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
    chrome.runtime
      .sendMessage({ level: lastTarget, ms: event.data.ms })
      .catch(() => {});
  }
});
window.postMessage({ type: "ITTT_MUSIC_READY", version: 2 }, location.origin);
window.addEventListener("pagehide", () => {
  if (armed) chrome.runtime.sendMessage({ level: 1, ms: 1000 }).catch(() => {});
});
