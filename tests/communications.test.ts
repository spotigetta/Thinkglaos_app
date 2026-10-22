import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { whatsappTemplates } from "../lib/communications";
import type { State } from "../lib/model";
import { answer } from "../lib/assistant";
test("Cinco textos para los destinatarios pedidos usan el evento actual, sin inventar entradas", () => {
  const state = JSON.parse(
      fs.readFileSync("public/data/seed.json", "utf8"),
    ) as State,
    templates = whatsappTemplates(state, state.events[0].id);
  assert.equal(templates.length, 5);
  assert.match(templates[0].text, /29 de octubre/);
  assert.match(templates[0].text, /Laura Rodríguez Rivero/);
  assert.match(templates[0].text, /Claustro Santo Tomé/);
  assert.match(templates[1].text, /barra libre de cerveza/);
  assert.doesNotMatch(templates[0].text, /entrada gratuita|http/);
  state.events[0].date = "2026-11-12";
  assert.match(
    whatsappTemplates(state, state.events[0].id)[0].text,
    /12 de noviembre/,
  );
});
test("Gemini recibe el proyecto actual y limita la respuesta, sin escribir sobre los datos", async () => {
  const original = globalThis.fetch,
    state = JSON.parse(
      fs.readFileSync("public/data/seed.json", "utf8"),
    ) as State,
    before = JSON.stringify(state);
  let payload: any;
  globalThis.fetch = async (_url, options) => {
    payload = JSON.parse(String(options?.body));
    return new Response(
      JSON.stringify({
        candidates: [
          {
            content: {
              parts: [
                { text: "El encuentro es el 29 de octubre a las 20:00." },
              ],
            },
          },
        ],
      }),
    );
  };
  try {
    const result = await answer(
      "¿Cuándo es?",
      state,
      [],
      state.events[0].id,
      "test-key-not-real",
      "gemini-3.5-flash-lite",
    );
    assert.match(payload.systemInstruction.parts[0].text, /Pablo Ramírez/);
    assert.match(payload.systemInstruction.parts[0].text, /Alejandro Zamora/);
    assert.match(
      payload.systemInstruction.parts[0].text,
      /Claustro Santo Tomé/,
    );
    assert.match(
      payload.systemInstruction.parts[0].text,
      /material-custodia-pablo/,
    );
    assert.equal(payload.generationConfig.maxOutputTokens, 600);
    assert.equal(JSON.stringify(state), before);
    assert.equal(result.ai, true);
  } finally {
    globalThis.fetch = original;
  }
});
