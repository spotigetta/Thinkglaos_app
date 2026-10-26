/* Capture begins only when the user explicitly clicks the extension on a music tab. */
const stageSubscribers = new Set();
const stageAllowed = (sender) => {
  try {
    const u = new URL(sender.url || "");
    return (
      !!sender.tab &&
      ((u.origin === "https://spotigetta.github.io" &&
        u.pathname.startsWith("/Thinkglaos_app/")) ||
        ["http://127.0.0.1:3000", "http://localhost:3000"].includes(u.origin))
    );
  } catch {
    return false;
  }
};
async function stageOffscreen() {
  if (!(await chrome.offscreen.hasDocument()))
    await chrome.offscreen.createDocument({
      url: "spectrum.html",
      reasons: ["USER_MEDIA"],
      justification:
        "Analyse the music tab selected by the user for live projection effects; preserve its audible playback.",
    });
}
async function placeProjector(tab) {
  const displays = await chrome.system.display.getInfo();
  const target =
    displays.find((d) => !d.isPrimary && d.activeState !== "inactive") ||
    displays.find((d) => d.isPrimary) ||
    displays[0];
  const bounds = target?.workArea || target?.bounds;
  const geometry = bounds
    ? {
        left: bounds.left,
        top: bounds.top,
        width: bounds.width,
        height: bounds.height,
      }
    : {};
  const tabs = await chrome.tabs.query({ windowId: tab.windowId });
  let id = tab.windowId;
  if (tabs.length > 1)
    id = (
      await chrome.windows.create({ tabId: tab.id, type: "popup", ...geometry })
    ).id;
  else {
    await chrome.windows.update(id, { state: "normal" });
    await chrome.windows.update(id, geometry);
  }
  await chrome.windows.update(id, { state: "fullscreen", focused: true });
  return { ok: true, secondary: !!target && !target.isPrimary };
}
chrome.runtime.onMessage.addListener((message, sender, respond) => {
  if (
    sender.url === chrome.runtime.getURL("spectrum.html") &&
    message.type === "STAGE_SPECTRUM_FRAME"
  ) {
    for (const tabId of stageSubscribers)
      void chrome.tabs
        .sendMessage(tabId, message)
        .catch(() => stageSubscribers.delete(tabId));
    return;
  }
  if (!stageAllowed(sender)) return;
  if (message.type === "ITTT_SPECTRUM_SUBSCRIBE") {
    stageSubscribers.add(sender.tab.id);
    respond({ ok: true });
    return;
  }
  if (message.type === "ITTT_SPECTRUM_STOP") {
    stageSubscribers.delete(sender.tab.id);
    if (!stageSubscribers.size) {
      void chrome.action.setBadgeText({ text: "" });
      void chrome.runtime
        .sendMessage({ target: "spectrum", type: "STAGE_SPECTRUM_STOP" })
        .catch(() => {});
    }
    respond({ ok: true });
    return;
  }
  if (message.type === "ITTT_SPECTRUM_GUIDE") {
    stageSubscribers.add(sender.tab.id);
    chrome.tabs
      .query({
        url: ["https://music.youtube.com/*", "https://open.spotify.com/*"],
      })
      .then(async (tabs) => {
        const tab = tabs.find((t) => t.audible) || tabs[0];
        if (!tab)
          return respond({
            error: "Abre YouTube Music o Spotify en este navegador.",
          });
        await chrome.tabs.update(tab.id, { active: true });
        await chrome.windows.update(tab.windowId, { focused: true });
        respond({ ok: true });
      })
      .catch(() => respond({ error: "No se pudo abrir la pestaña musical." }));
    return true;
  }
  if (
    message.type === "ITTT_PROJECTOR_PLACE" &&
    new URL(sender.url).searchParams.has("projection")
  ) {
    placeProjector(sender.tab)
      .then(respond)
      .catch((error) => respond({ error: error.message }));
    return true;
  }
});
chrome.action.onClicked.addListener(async (tab) => {
  if (
    !/^https:\/\/(music\.youtube\.com|open\.spotify\.com)\//.test(tab.url || "")
  ) {
    await chrome.action.setBadgeText({ text: "MUSIC" });
    await chrome.action.setTitle({
      title:
        "Abre YouTube Music o Spotify y pulsa aquí para conectar las vibes.",
    });
    return;
  }
  try {
    const captured = await chrome.tabCapture.getCapturedTabs();
    if (captured.some((c) => c.tabId === tab.id && c.status === "active")) {
      await chrome.runtime.sendMessage({
        target: "spectrum",
        type: "STAGE_SPECTRUM_STOP",
      });
      await chrome.action.setBadgeText({ text: "" });
      return;
    }
    await stageOffscreen();
    const streamId = await chrome.tabCapture.getMediaStreamId({
      targetTabId: tab.id,
    });
    const lock = (await chrome.storage.session.get("itttPlaybackLock"))
      .itttPlaybackLock;
    const result = await chrome.runtime.sendMessage({
      target: "spectrum",
      type: "STAGE_SPECTRUM_START",
      streamId,
      blocked: lock?.active === true,
    });
    if (!result?.ok)
      throw Error(result?.error || "No se pudo conectar el audio");
    await chrome.action.setBadgeText({ text: "ON" });
    await chrome.action.setBadgeBackgroundColor({ color: "#355b48" });
    await chrome.action.setTitle({
      title: "Vibes conectadas · desactívalas desde la mesa",
    });
  } catch (error) {
    await chrome.action.setBadgeText({ text: "!" });
    await chrome.action.setTitle({ title: "Vibes: " + error.message });
  }
});
chrome.tabs.onRemoved?.addListener((id) => {
  if (stageSubscribers.delete(id) && !stageSubscribers.size)
    void chrome.runtime
      .sendMessage({ target: "spectrum", type: "STAGE_SPECTRUM_STOP" })
      .catch(() => {});
});
