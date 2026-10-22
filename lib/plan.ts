import { Phase } from "../types";
export function normalizePhase(value: string): Phase {
  if (["1 Semana Antes", "Organizar"].includes(value)) return Phase.WEEK_BEFORE;
  if (
    ["La Tarde de Antes", "Protocolo de Entradas", "Esa tarde"].includes(value)
  )
    return Phase.AFTERNOON_BEFORE;
  if (["Post-Thinkglao", "Fin"].includes(value)) return Phase.POST_EVENT;
  return Phase.DURING;
}
// Existing IDs retain their assignments and completion; only the operational guide changes.
export const planUpdates: Record<
  string,
  { time: string; title?: string; notes?: string[] }
> = {
  "planning-0": {
    time: "Días previos",
    notes: [
      "Confirmar megafonía, micro y música.",
      "Alfombras si el suelo está frío.",
      "Confirmar climatización; si falta, disponer equipos y climatizar horas antes.",
      "Disponer mesas para la comida de después.",
      "Confirmar acceso, aforo y condiciones con el lugar.",
    ],
  },
  "manual-004": {
    time: "Días previos",
    notes: [
      "Pedir entrega de Mercadona a las 17:30 (horario de trabajo propuesto).",
      "Confirmar persona para recibir y espacio en frío.",
      "Coordinar cantidades con el aforo previsto.",
    ],
  },
  "manual-007": {
    time: "Día anterior",
    title: "Kit del embajador",
    notes: [
      "1 rollup.",
      "La bombilla.",
      "Thinkómetro: encender y probar.",
      "2 espuertas con abridores.",
      "2 tablas de cortar.",
      "Cuchillos para cortar.",
      "Pablo conserva los materiales del anterior Thinkglao: coordinar recogida.",
    ],
  },
  "manual-005": {
    time: "17:30 · propuesta",
    title: "Recibir Mercadona",
    notes: [
      "Recepcionar el pedido.",
      "Guardar inmediatamente lo que necesita frío.",
      "Comprobar cantidades y avisar si falta algo.",
    ],
  },
  "manual-008": {
    time: "17:40 · orientativa",
    notes: [
      "Colocar bebidas en las dos espuertas con hielo y agua.",
      "Dejar abridores disponibles.",
      "Reservar bebida en frío para reponer.",
    ],
  },
  "manual-009": {
    time: "17:45 · orientativa",
    notes: [
      "Cortar fuet y preparar la comida.",
      "Usar las dos tablas y los cuchillos.",
      "Organizar las mesas de comida y reservas.",
    ],
  },
  "manual-010": {
    time: "18:00 · orientativa",
    notes: [
      "Música durante todo el montaje, camisetas de voluntario y buen rollo.",
      "Preparar iluminación, rollup, bombilla y pantalla del thinkómetro.",
      "Indicar claramente THINKGLAO en la entrada.",
    ],
  },
  "manual-011": {
    time: "18:30 · orientativa",
    notes: [
      "Probar acústica, megafonía y micro.",
      "Comprobar climatización y alfombras si el suelo está frío.",
      "Mesas de comida listas; paso y accesos despejados.",
      "Thinkómetro visible y ponente cómodo.",
    ],
  },
  "manual-012": { time: "19:00 · orientativa" },
  "manual-013": {
    time: "19:30 · propuesta",
    notes: [
      "Responsable en la puerta a las 19:30.",
      "App de lectura QR instalada y con acceso autorizado.",
      "Probar escáner y tener batería o cargador.",
    ],
  },
  "manual-014": { time: "19:30 · propuesta" },
  "manual-015": { time: "19:30–20:00 · propuesta" },
  "manual-016": { time: "19:30–20:00 · propuesta" },
};
export const extraPlan = [
  {
    id: "operativa-clima",
    phase: Phase.AFTERNOON_BEFORE,
    title: "Climatizar el lugar",
    time: "17:00 · orientativa",
    notes: [
      "Encender climatización con antelación suficiente.",
      "Si no hay equipos, llevarlos y acordar su uso con el lugar.",
      "Comprobar temperatura antes de recibir al equipo.",
    ],
  },
  {
    id: "operativa-cuidados",
    phase: Phase.DURING,
    title: "Comida, bebida y comodidad",
    time: "20:00–23:30 · continuo",
    notes: [
      "Reponer comida y bebida: que siempre haya.",
      "Comprobar que el ponente esté cómodo.",
      "Estar pendientes de que todos estén cómodos.",
    ],
  },
  {
    id: "operativa-pizzas",
    phase: Phase.DURING,
    title: "Recibir las pizzas",
    time: "Durante · hora por confirmar",
    notes: [
      "Confirmar hora de entrega con el proveedor.",
      "Dejar un responsable atento al teléfono y a la puerta.",
      "Recibir y colocar las pizzas en las mesas.",
    ],
  },
  {
    id: "operativa-cierre",
    phase: Phase.POST_EVENT,
    title: "Despedida e inventario",
    time: "23:30 · fin oficial",
    notes: [
      "Despedir al ponente y asistentes.",
      "Recoger, limpiar y revisar el lugar.",
      "Contar rollup, bombilla, thinkómetro, 2 espuertas, abridores, 2 tablas y cuchillos.",
      "Anotar sobrantes y quién guarda cada material.",
      "Comprobar luces, equipos, cierre y despedirse del equipo.",
    ],
  },
];
