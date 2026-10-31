export const showTracks = [
  { url: "./media/levels.mp3", name: "Levels · Avicii" },
  {
    url: "./media/disco-yes-previa-3min.mp3",
    name: "Disco Yes · previa 3 min",
  },
  { url: "./media/disco-yes.mp3", name: "Disco Yes · completa" },
  {
    url: "./media/give-me-everything.mp3",
    name: "Give Me Everything · Pitbull",
  },
  {
    url: "./media/sexy-bitch.mp3",
    name: "Sexy Bitch (feat. Akon) · David Guetta",
  },
];
export const readShowTrack = (value: unknown) =>
  showTracks.some((track) => track.url === value)
    ? (value as string)
    : showTracks[0].url;
