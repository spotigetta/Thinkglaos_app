import React, { useEffect, useRef, useState } from "react";
import {
  getDocument,
  GlobalWorkerOptions,
  type PDFDocumentProxy,
  type RenderTask,
} from "pdfjs-dist";
import workerURL from "pdfjs-dist/build/pdf.worker.min.mjs?url";
GlobalWorkerOptions.workerSrc = workerURL;
const URL = "./books/el-secreto-de-la-salsa.pdf";
export default function BookReader() {
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);
  const [page, setPage] = useState(() => {
    const saved = Number(localStorage.getItem("thinkglaos-book-page"));
    return saved > 0 && saved <= 81 ? saved : 1;
  });
  const [zoom, setZoom] = useState(1);
  const [width, setWidth] = useState(600);
  const [error, setError] = useState("");
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const canvas = useRef<HTMLCanvasElement>(null);
  const container = useRef<HTMLDivElement>(null);
  const rendering = useRef<RenderTask | null>(null);
  useEffect(() => {
    const loader = getDocument({ url: URL });
    let active = true;
    loader.promise
      .then((doc) => {
        if (active) setPdf(doc);
      })
      .catch((e) => {
        if (active)
          setError(
            "No se ha podido abrir el libro. Puedes descargar el PDF original.",
          );
      });
    return () => {
      active = false;
      rendering.current?.cancel();
      void loader.destroy();
    };
  }, []);
  useEffect(() => {
    if (!container.current) return;
    const element = container.current;
    const observer = new ResizeObserver((entries) =>
      setWidth(Math.max(250, entries[0].contentRect.width - 12)),
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (!pdf || !canvas.current) return;
    let cancelled = false;
    const previous = rendering.current;
    previous?.cancel();
    setLoading(true);
    setError("");
    setText("");
    async function render() {
      try {
        await previous?.promise.catch(() => {});
        const source = await pdf!.getPage(page);
        if (cancelled) return;
        const viewport = source.getViewport({
          scale:
            Math.min(width / source.getViewport({ scale: 1 }).width, 1.5) *
            zoom,
        });
        const target = canvas.current!;
        const ratio = Math.min(window.devicePixelRatio || 1, 2);
        target.width = Math.floor(viewport.width * ratio);
        target.height = Math.floor(viewport.height * ratio);
        target.style.width = viewport.width + "px";
        target.style.height = viewport.height + "px";
        const task = source.render({
          canvas: target,
          canvasContext: target.getContext("2d")!,
          viewport,
          transform: ratio !== 1 ? [ratio, 0, 0, ratio, 0, 0] : undefined,
        });
        rendering.current = task;
        await task.promise;
        if (cancelled) return;
        const content = await source.getTextContent();
        if (cancelled) return;
        setText(
          content.items
            .map((item) => ("str" in item ? item.str : ""))
            .join(" "),
        );
        setLoading(false);
        localStorage.setItem("thinkglaos-book-page", String(page));
      } catch (e) {
        if (!cancelled && (e as Error).name !== "RenderingCancelledException") {
          setError(
            "No se ha podido mostrar esta página. Prueba otra página o descarga el libro.",
          );
          setLoading(false);
        }
      }
    }
    void render();
    return () => {
      cancelled = true;
      rendering.current?.cancel();
    };
  }, [pdf, page, zoom, width]);
  return (
    <section className="book-reader">
      <p>El secreto de la salsa · Libro del voluntario de ITTT</p>
      <div className="book-controls">
        <button
          className="btn"
          disabled={page <= 1}
          onClick={() => setPage((p) => p - 1)}
        >
          ← Anterior
        </button>
        <label>
          Página{" "}
          <select
            aria-label="Página del libro"
            value={page}
            onChange={(e) => setPage(Number(e.target.value))}
          >
            {Array.from({ length: pdf?.numPages || 81 }, (_, i) => (
              <option key={i} value={i + 1}>
                {i + 1}
              </option>
            ))}
          </select>{" "}
          / {pdf?.numPages || 81}
        </label>
        <button
          className="btn"
          disabled={!pdf || page >= pdf.numPages}
          onClick={() => setPage((p) => p + 1)}
        >
          Siguiente →
        </button>
        <button
          className="btn"
          aria-label="Reducir zoom del libro"
          onClick={() => setZoom((z) => Math.max(0.75, z - 0.25))}
        >
          −
        </button>
        <button
          className="btn"
          aria-label="Ampliar zoom del libro"
          onClick={() => setZoom((z) => Math.min(2, z + 0.25))}
        >
          +
        </button>
      </div>
      <div className="book-chapters">
        {[
          ["La misión", 15],
          ["Ciclo del voluntario", 33],
          ["Cuidar al equipo", 40],
          ["Guía de campo", 74],
          ["Roles de la noche", 77],
        ].map(([label, number]) => (
          <button key={number} onClick={() => setPage(Number(number))}>
            {label}
          </button>
        ))}
      </div>
      {error && <p role="alert">{error}</p>}
      <div className="book-canvas" ref={container} aria-busy={loading}>
        {loading && !error && <p role="status">Abriendo página…</p>}
        <canvas ref={canvas} aria-label={"Libro, página " + page} />
      </div>
      <details>
        <summary>Texto accesible de esta página</summary>
        <p>{text}</p>
      </details>
      <a className="btn" href={URL} download="El_secreto_de_la_salsa.pdf">
        Descargar libro completo
      </a>
    </section>
  );
}
