import React from "react";
export function KineticText({
  text,
  effect,
}: {
  text: string;
  effect: number;
}) {
  let letter = 0;
  return (
    <span className={"kinetic-text kinetic-" + effect} aria-label={text}>
      {text.split(" ").map((word, i) => (
        <React.Fragment key={i}>
          <span
            className="kinetic-word"
            style={{ "--word": i } as React.CSSProperties}
            aria-hidden="true"
          >
            {Array.from(word).map((char, j) => (
              <span
                className="kinetic-letter"
                key={j}
                style={{ "--letter": letter++ } as React.CSSProperties}
              >
                {char}
              </span>
            ))}
          </span>{" "}
        </React.Fragment>
      ))}
    </span>
  );
}
