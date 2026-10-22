import React, { useEffect, useRef, useState } from "react";
export type Quote = {
  id: string;
  text: string;
  videoId: string;
  sourceTitle: string;
  url: string;
  speaker?: string;
  provenance: string;
};
export function QuoteShorts() {
  const [quotes, setQuotes] = useState<Quote[]>([]),
    [query, setQuery] = useState(""),
    [active, setActive] = useState(""),
    [notice, setNotice] = useState(""),
    [error, setError] = useState("");
  const rail = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const controller = new AbortController();
    fetch("./media/quotes.json", { signal: controller.signal })
      .then((r) => {
        if (!r.ok) throw Error();
        return r.json();
      })
      .then((data) => setQuotes(data.items))
      .catch((e) => {
        if (e.name !== "AbortError")
          setError("No se han podido cargar las frases.");
      });
    return () => controller.abort();
  }, []);
  useEffect(() => {
    if (!active || !rail.current) return;
    const element = rail.current.querySelector('[data-quote="' + active + '"]');
    if (!element) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) setActive("");
      },
      { root: rail.current, threshold: 0.5 },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [active]);
  async function share(quote: Quote) {
    const text =
      "«" +
      quote.text +
      "»\n" +
      (quote.speaker ? quote.speaker + " · " : "") +
      "Thinkglaos\n" +
      quote.url;
    try {
      if (navigator.share)
        await navigator.share({ title: "Una frase de Thinkglaos", text });
      else {
        await navigator.clipboard.writeText(text);
        setNotice("Frase y fuente copiadas.");
      }
    } catch (e) {
      if ((e as Error).name !== "AbortError")
        setNotice("Puedes abrir el vídeo de origen para compartirlo.");
    }
  }
  const normalize = (s: string) =>
    s
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  const filtered = quotes.filter((q) =>
    normalize(q.text + " " + q.sourceTitle).includes(normalize(query)),
  );
  return (
    <section className="quote-shorts">
      <div className="quote-heading">
        <h3>Frases que se quedan</h3>
        <span>{filtered.length} citas con fuente</span>
      </div>
      <p>
        Destacadas en los títulos oficiales de ITTT. Consulta el fragmento para
        su contexto; no son transcripciones revisadas.
      </p>
      <input
        aria-label="Buscar entre las frases"
        placeholder="Busca una idea o un ponente…"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setActive("");
        }}
      />
      {error && <p role="status">{error}</p>}
      <div
        className="quote-rail"
        ref={rail}
        tabIndex={0}
        aria-label="Frases en formato Shorts: desliza hacia arriba"
      >
        {filtered.map((quote, index) => (
          <article
            key={quote.id}
            className="quote-short"
            data-quote={quote.id}
            style={{
              backgroundImage: `linear-gradient(160deg,#111b14a0,#131b12f2),url("./montage/photo-${(index % 6) + 1}.jpg")`,
            }}
          >
            <span className="quote-number">
              ITTT / {String(index + 1).padStart(2, "0")}
            </span>
            <blockquote
              className={
                quote.text.length > 140
                  ? "long"
                  : quote.text.length > 90
                    ? "medium"
                    : ""
              }
            >
              «{quote.text}»
            </blockquote>
            <div className="quote-footer">
              <b>{quote.speaker || "Thinkglaos · ITTT"}</b>
              <small>{quote.provenance}</small>
              <div>
                <button
                  onClick={() => {
                    document
                      .querySelectorAll<HTMLMediaElement>("video,audio")
                      .forEach((m) => m.pause());
                    setActive(quote.id);
                  }}
                >
                  Ver fragmento ▶
                </button>
                <button onClick={() => void share(quote)}>Compartir</button>
              </div>
              <a href={quote.url} target="_blank" rel="noreferrer">
                Fuente: {quote.sourceTitle} ↗
              </a>
            </div>
            {active === quote.id && (
              <div className="quote-video">
                <button
                  onClick={() => setActive("")}
                  aria-label="Cerrar vídeo de la frase"
                >
                  Cerrar ×
                </button>
                <iframe
                  title={quote.sourceTitle}
                  src={
                    "https://www.youtube-nocookie.com/embed/" +
                    quote.videoId +
                    "?autoplay=1&playsinline=1&rel=0"
                  }
                  allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
                  allowFullScreen
                  referrerPolicy="strict-origin-when-cross-origin"
                />
              </div>
            )}
          </article>
        ))}
      </div>
      {!filtered.length && !error && <p>No hay frases para esa búsqueda.</p>}
      {notice && <p role="status">{notice}</p>}
      <small>Desliza ↑↓ o usa las flechas del teclado.</small>
    </section>
  );
}
