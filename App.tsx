import React from "react";
import Workspace from "./lib/Workspace";
import Show from "./lib/Show";
export default function App() {
  const q = new URLSearchParams(location.search);
  return q.has("projection") || q.has("control") ? <Show /> : <Workspace />;
}
