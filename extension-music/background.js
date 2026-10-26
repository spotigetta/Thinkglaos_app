if (typeof importScripts === "function")
  importScripts("playback-lock.js", "stage-tools.js");
chrome.runtime.onMessage.addListener((message, sender, respond) => {
  if (!sender.tab) return;
  const origin = new URL(sender.url || sender.tab.url || "about:blank");
  if (
    !(
      origin.origin === "https://spotigetta.github.io" &&
      origin.pathname.startsWith("/Thinkglaos_app/")
    ) &&
    !["http://127.0.0.1:3000", "http://localhost:3000"].includes(origin.origin)
  )
    return;
  if (
    !message.status &&
    (typeof message.level !== "number" || !Number.isFinite(message.level))
  )
    return;
  const level = Math.max(0, Math.min(1, message.level ?? 1)),
    ms = Math.max(200, Math.min(8000, message.ms || 1400)),
    revision = Number.isFinite(message.revision)
      ? message.revision
      : Date.now();
  const run = async () => {
    const tabs = await chrome.tabs.query({
      url: ["https://music.youtube.com/*", "https://open.spotify.com/*"],
    });
    if (!message.status && typeof message.stopPlayback === "boolean") {
      const accepted = await setPlaybackLock(
        tabs.filter((t) => t.id !== sender.tab.id),
        message.stopPlayback,
        revision,
        sender.tab.id,
      );
      if (accepted && typeof chrome.runtime.sendMessage === "function") {
        try {
          await chrome.runtime.sendMessage({
            target: "spectrum",
            type: "STAGE_AUDIO_GATE",
            blocked: message.stopPlayback,
          });
        } catch {}
      }
      if (!accepted) {
        respond(null);
        return;
      }
    }
    const results = await Promise.allSettled(
      tabs
        .filter((t) => t.id !== sender.tab.id)
        .map((tab) =>
          chrome.scripting.executeScript({
            target: { tabId: tab.id },
            world: "MAIN",
            args: [!!message.status, level, ms, revision],
            func: (status, level, ms, revision) => {
              const data = window.__itttMix || (window.__itttMix = new Map());
              const medias = [...document.querySelectorAll("audio,video")];
              if (!status && revision >= (window.__itttMixRevision || 0)) {
                window.__itttMixRevision = revision;
                medias.forEach((media) => {
                  let saved = data.get(media);
                  if (!saved) {
                    if (media.paused || level === 1) return;
                    saved = { original: media.volume, timer: 0, target: -1 };
                    data.set(media, saved);
                  }
                  const target = saved.original * level;
                  if (
                    saved.target === target &&
                    (saved.timer || Math.abs(media.volume - target) < 0.002)
                  )
                    return;
                  saved.target = target;
                  clearInterval(saved.timer);
                  const from = media.volume,
                    start = Date.now();
                  const step = () => {
                    const p = Math.min(1, (Date.now() - start) / ms);
                    media.volume = Math.max(
                      0,
                      Math.min(1, from + (target - from) * p * p * (3 - 2 * p)),
                    );
                    if (p === 1) {
                      clearInterval(saved.timer);
                      saved.timer = 0;
                      if (level === 1) data.delete(media);
                    }
                  };
                  saved.timer = setInterval(step, 40);
                  step();
                });
              }
              const media = medias.find((m) => !m.paused) || medias[0],
                meta = navigator.mediaSession?.metadata;
              return {
                title: meta?.title || document.title,
                artist: meta?.artist || "",
                playing: !!media && !media.paused,
                volume: media?.volume || 0,
              };
            },
          }),
        ),
    );
    const tracks = results.flatMap((r) =>
      r.status === "fulfilled"
        ? r.value.map((v) => v.result).filter(Boolean)
        : [],
    );
    respond(
      tracks.find((t) => t.playing) ||
        tracks[0] || {
          title: "Sin música externa",
          artist: "",
          playing: false,
          volume: 0,
        },
    );
  };
  (typeof queueMusicOperation === "function"
    ? queueMusicOperation(run)
    : run()
  ).catch(() => respond(null));
  return true;
});
