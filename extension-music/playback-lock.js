/* Native tab mute survives replacement players, advertisements and page reloads. */
function guardMusicPlayback(blocked, resume) {
  let guard = window.__itttPlaybackGuard;
  const media = [...document.querySelectorAll("audio,video")];
  if (blocked) {
    if (!guard) {
      const mix = window.__itttMix || (window.__itttMix = new Map());
      guard = {
        blocked: true,
        wasPlaying: media.some((m) => !m.paused),
        pause(event) {
          const candidates = event?.target?.matches?.("audio,video")
            ? [event.target]
            : [...document.querySelectorAll("audio,video")];
          for (const item of candidates) {
            if (!mix.has(item))
              mix.set(item, { original: item.volume, timer: 0, target: -1 });
            if (!item.paused) item.pause();
          }
        },
      };
      window.__itttPlaybackGuard = guard;
      document.addEventListener("play", guard.pause, true);
      document.addEventListener("playing", guard.pause, true);
      guard.observer = new MutationObserver(() => guard.pause());
      guard.observer.observe(document.documentElement, {
        childList: true,
        subtree: true,
      });
    }
    guard.pause();
    return { wasPlaying: guard.wasPlaying };
  }
  if (guard) {
    document.removeEventListener("play", guard.pause, true);
    document.removeEventListener("playing", guard.pause, true);
    guard.observer.disconnect();
    delete window.__itttPlaybackGuard;
  }
  if (resume) {
    const player = media.find((m) => m.readyState > 0) || media[0];
    void player?.play().catch(() => {});
  }
  return { wasPlaying: false };
}
const musicTabUrl = (url) =>
  /^https:\/\/(music\.youtube\.com|open\.spotify\.com)\//.test(url || "");
async function muteMusicTab(tab, state) {
  const id = String(tab.id);
  const first = !state.tabs[id];
  if (first)
    state.tabs[id] = { muted: tab.mutedInfo?.muted === true, playing: false };
  await chrome.tabs.update(tab.id, { muted: true });
  try {
    const result = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      world: "MAIN",
      func: guardMusicPlayback,
      args: [true, false],
    });
    if (first)
      state.tabs[id].playing = result.some((r) => r.result?.wasPlaying);
  } catch {} // Native mute still covers cross-origin ad players and loading documents.
}
async function setPlaybackLock(tabs, blocked, revision, owner) {
  const state = (await chrome.storage.session.get("itttPlaybackLock"))
    .itttPlaybackLock || { active: false, revision: -1, tabs: {} };
  if (revision < state.revision) return false;
  state.revision = revision;
  state.active = blocked;
  state.owner = owner;
  if (blocked) {
    for (const tab of tabs) await muteMusicTab(tab, state);
    await chrome.storage.session.set({ itttPlaybackLock: state });
  } else {
    await chrome.storage.session.set({
      itttPlaybackLock: { ...state, tabs: {} },
    });
    for (const [id, saved] of Object.entries(state.tabs)) {
      try {
        await chrome.scripting.executeScript({
          target: { tabId: Number(id) },
          world: "MAIN",
          func: guardMusicPlayback,
          args: [false, saved.playing],
        });
      } catch {}
      try {
        await chrome.tabs.update(Number(id), { muted: saved.muted });
      } catch {}
    }
  }
  return true;
}
function queueMusicOperation(job) {
  const next = (globalThis.__itttMusicOperations || Promise.resolve())
    .catch(() => {})
    .then(job);
  globalThis.__itttMusicOperations = next;
  return next;
}
chrome.tabs.onUpdated?.addListener((id, change, tab) => {
  if (
    !musicTabUrl(tab.url) ||
    !(change.status || change.url || change.mutedInfo?.muted === false)
  )
    return;
  void queueMusicOperation(async () => {
    const state = (await chrome.storage.session.get("itttPlaybackLock"))
      .itttPlaybackLock;
    if (!state?.active) return;
    await muteMusicTab(tab, state);
    await chrome.storage.session.set({ itttPlaybackLock: state });
  });
});
chrome.tabs.onRemoved?.addListener((id) => {
  void queueMusicOperation(async () => {
    const state = (await chrome.storage.session.get("itttPlaybackLock"))
      .itttPlaybackLock;
    if (state?.active && state.owner === id)
      await setPlaybackLock(
        [],
        false,
        Math.max(Date.now(), state.revision + 1),
        id,
      );
  });
});
