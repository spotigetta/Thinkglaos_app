import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { INITIAL_TASKS } from "../constants";
import { Phase, Role } from "../types";
import type { State, Knowledge } from "../lib/model";
const base = path.resolve("..");
fs.mkdirSync(".local/source-documents", { recursive: true });
fs.mkdirSync("public/data", { recursive: true });
const walk = (dir: string): string[] =>
  fs
    .readdirSync(dir, { withFileTypes: true })
    .flatMap((entry) =>
      entry.name === ".git" ||
      entry.name === "node_modules" ||
      entry.name === "Thinkglaos_app"
        ? []
        : entry.isDirectory()
          ? walk(path.join(dir, entry.name))
          : entry.name.endsWith(".md")
            ? [path.join(dir, entry.name)]
            : [],
    );
const sources = walk(base).map((file) => {
  const text = fs.readFileSync(file, "utf8"),
    relative = path.relative(base, file);
  fs.mkdirSync(path.dirname(path.join(".local/source-documents", relative)), {
    recursive: true,
  });
  fs.writeFileSync(path.join(".local/source-documents", relative), text);
  return {
    name: relative.replaceAll("\\", "/"),
    sha256: crypto.createHash("sha256").update(text).digest("hex"),
    bytes: Buffer.byteLength(text),
  };
});
const manual = fs.readFileSync("components/manualCompleto.txt", "utf8");
const knowledge: Knowledge = {
  note: "Los originales se conservan solo en el archivo local. La investigación de espacios es histórica: no acredita disponibilidad, aforo, permisos ni acuerdos actuales.",
  sources,
  documents: [
    {
      id: "format",
      title: "Qué es un Thinkglao",
      kind: "manual",
      text: "# Una buena conversación cambia la noche\nThinkglao es el encuentro presencial de IT’S TIME TO THINK para fomentar el pensamiento crítico entre jóvenes adultos. El ambiente es cercano: iluminación cálida, público en el suelo y una conversación compartida.\n\n## Las cuatro partes\n1. La previa: llegada, música suave, bebida y algo de picar.\n2. Thinknómetro: una charla de 18 minutos, con cronómetro visible.\n3. Diálogo: aproximadamente 45 minutos de preguntas.\n4. Postpartido: pizzas y conversación.\n\n## Identidad\nAmarillo cálido, negro, blanco y una bombilla protagonista. Los patrocinios locales se acuerdan con ITTT y respetan la identidad del formato.",
    },
    {
      id: "manual",
      title: "Manual completo de organización",
      kind: "manual",
      text:
        "> Documento de trabajo del ZIP original. Las cifras de ciudades y objetivos de expansión son históricas. Las condiciones actuales de proveedores, accesos, datos fiscales y acuerdos deben confirmarse con ITTT.\n\n" +
        manual,
    },
    {
      id: "spaces",
      title: "Cómo elegir y negociar el espacio",
      kind: "guía",
      text: "# Espacio, experiencia y acuerdo\nBuscar en Toledo un espacio diáfano, cálido y accesible. La referencia histórica era un encuentro de unas 80 personas; confirmar siempre el aforo autorizado del evento actual.\n\n## Comprobar antes de confirmar\n- Capacidad y disposición del público en el suelo.\n- Acceso para montaje y hora límite de salida.\n- Música, enchufes, iluminación y sonido.\n- Comida y bebida: autorización y posibles exclusividades de marcas.\n- Seguro y responsabilidades, limpieza y recogida.\n- Precio y condiciones por escrito.\n\n## Acuerdos posibles, pendientes de aprobación\nCesión cultural, intercambio de visibilidad o uso en horario de baja demanda. No prometer naming, bases de datos, patrocinios, exclusividad ni consumo mínimo sin validar con ITTT. El espacio es anfitrión, el formato mantiene su identidad.\n\n## Propuestas históricas\nLos informes locales proponen Matadero Lab, Círculo de Arte, Real Fundación de Toledo, UCLM, bibliotecas, hoteles y otros espacios. Son candidatos investigados; no son reservas ni presupuestos vigentes.",
    },
    {
      id: "open-questions",
      title: "Dudas que debe resolver ITTT",
      kind: "pendiente de confirmar",
      text: "# No dar por hecho\n- Compatibilidad de cerveza patrocinada con exclusividades del local.\n- Entradas, alcohol y restricciones de espacios públicos o universitarios.\n- Modelos económicos permitidos con anfitriones.\n- Remuneración, transporte y alojamiento de ponentes.\n- Visibilidad de patrocinadores y límites de la marca.\n- Seguro de responsabilidad civil: quién lo aporta y cobertura.\n- Dossier y material oficial para embajadores.\n\nEn los documentos estas cuestiones aparecen como preguntas abiertas; la aplicación no las convierte en políticas aprobadas.",
    },
  ],
};
fs.writeFileSync(
  "public/data/knowledge.json",
  JSON.stringify(knowledge, null, 2) + "\n",
);
const statePath = "public/data/seed.json";
if (!fs.existsSync(statePath)) {
  const eventId = "toledo-proxima",
    planning = [
      [
        "Cerrar espacio y condiciones",
        "Confirmar aforo, comida y bebida, suelo, música, seguro, acceso y cierre por escrito.",
      ],
      [
        "Confirmar ponente y fecha",
        "Alinear ponente, espacio y equipo. Explicar los 18 minutos y el turno de preguntas.",
      ],
      [
        "Formar el equipo local",
        "Confirmar puerta QR, apoyo, logística, contenido y responsable de material.",
      ],
      [
        "Cartel, landing y difusión",
        "Coordinar con ITTT los datos del evento y probar el enlace de entradas.",
      ],
    ];
  const state: State = {
    schemaVersion: 1,
    revision: 0,
    updatedAt: new Date().toISOString(),
    appliedOps: [],
    events: [
      {
        id: eventId,
        name: "Próximo Thinkglao",
        city: "Toledo",
        date: "",
        start: "20:00",
        end: "23:00",
        venue: "",
        speaker: "",
        capacity: 80,
        ticketsURL: "",
        notes:
          "Fecha, espacio y ponente pendientes de confirmar. No se han importado las fechas históricas de enero/febrero de 2026 como eventos actuales.",
      },
    ],
    tasks: [
      ...planning.map(([title, note], i) => ({
        id: "planning-" + i,
        eventId,
        title,
        phase: Phase.WEEK_BEFORE,
        originalRole: Role.AMBASSADOR,
        assignedTo: Role.AMBASSADOR,
        isDone: false,
        isImportant: true,
        notes: [note],
      })),
      ...INITIAL_TASKS.map((task) => ({ ...task, eventId })),
    ],
    members: Object.values(Role)
      .filter((role) => role !== Role.ALL && role !== Role.UNASSIGNED)
      .map((role, i) => ({
        id: "role-" + i,
        name: role,
        role,
        note: "Puesto por asignar a una persona",
      })),
    venues: [
      ["Matadero Lab", "Cultura joven", "Espacios/Informe de lugares.md"],
      [
        "Círculo de Arte de Toledo",
        "Centro histórico",
        "Espacios/Informe de lugares.md",
      ],
      [
        "Real Fundación de Toledo · Roca Tarpeya",
        "Judería",
        "Espacios/Lugares Chatgpt.md",
      ],
      [
        "UCLM · Fábrica de Armas",
        "Campus universitario",
        "Espacios/Lugares Comet.md",
      ],
      [
        "Biblioteca de Castilla-La Mancha",
        "Alcázar",
        "Espacios/Lugares Comet.md",
      ],
      [
        "Mezquita de Tornerías",
        "Centro histórico",
        "Espacios/Lugares Chatgpt.md",
      ],
      ["Sala Thalía", "Benquerencia", "Espacios/Lugares Comet 2.md"],
      [
        "Colegio de Arquitectos",
        "Centro histórico",
        "Espacios/Lugares Chatgpt.md",
      ],
      ["Cámara de Comercio · Vivero", "Dinamarca", "Espacios/Lugares Comet.md"],
      [
        "El Patio de los Ángeles",
        "Centro histórico",
        "Espacios/Lugares Chatgpt.md",
      ],
      ["Hotel Beatriz", "Toledo", "Espacios/Informe de lugares.md"],
      [
        "Eurostars Palacio Buenavista",
        "Buenavista",
        "Espacios/Informe de lugares.md",
      ],
      ["Sala Pícaro", "Centro histórico", "Espacios/Informe Claude.md"],
      ["Venta de Aires", "Toledo", "Espacios/Informe Claude.md"],
      ["Sala Next Level", "Toledo", "Espacios/Informe Claude.md"],
    ].map(([name, area, source], i) => ({
      id: "venue-" + i,
      name,
      area,
      source,
      status: "Por validar",
      notes:
        "Candidato de la investigación histórica. Confirmar disponibilidad, capacidad para el formato, condiciones y presupuesto.",
      url: "",
    })),
    resources: [],
  };
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2) + "\n");
}
console.log(
  "Documentación inventariada: " +
    sources.length +
    " Markdown. Originales conservados en .local; manual y contexto publicados sin datos personales.",
);
