export const stageLabels: Record<string, string> = {
  montaje: "Montaje · sin prisa",
  ambiente: "Ambientillo · 30 minutos",
  llamada: "A sentarse",
  salida: "Cuenta atrás hacia la intro",
  intro: "Intro",
  charla: "Thinkómetro · 18 minutos",
  preguntas: "Preguntas · 45 minutos",
  pantalla: "Pantalla compartida",
};
const montage = [
  [
    "ENTRE BASTIDORES",
    "La noche empieza contigo.",
    "Cada pequeño detalle hace sitio a una gran conversación.",
  ],
  [
    "EL SECRETO DE LA SALSA",
    "El ingrediente secreto eres tú.",
    "Una mesa, unas manos y ganas de encontrarnos.",
  ],
  [
    "ASÍ SE COCINA UN THINKGLAO",
    "Primero, hacemos equipo.",
    "Después, dejamos que pasen cosas.",
  ],
  [
    "PREPARANDO EL TERRENO",
    "Un poco de luz. Muchas ideas.",
    "La bombilla se enciende entre todos.",
  ],
  [
    "MAKING OF · TOLEDO",
    "Montamos algo más que mesas.",
    "Estamos preparando un lugar para escuchar.",
  ],
  [
    "BUEN ROLLO EN CONSTRUCCIÓN",
    "La comunidad también se prepara.",
    "Música, camisetas y manos que se suman.",
  ],
  [
    "CONTROL DE CALIDAD",
    "Bebida fría. Acogida cálida.",
    "La fórmula no falla.",
  ],
  [
    "AVISO A NUESTRO EQUIPO",
    "El fuet se corta. Las ideas se comparten.",
    "Gracias por hacer posible esta noche.",
  ],
  [
    "UN ENCUENTRO HECHO A MANO",
    "Cada saludo cuenta.",
    "Lo importante empieza mucho antes del primer micrófono.",
  ],
  [
    "NOS PARAMOS A PENSAR",
    "Toledo tiene otra conversación pendiente.",
    "Esta noche la empezamos juntos.",
  ],
];
const atmosphere = [
  [
    "BIENVENIDOS A LA CONVERSACIÓN",
    "Ven con curiosidad.",
    "Lo demás lo ponemos entre todos.",
  ],
  [
    "EL SECRETO DE LA SALSA",
    "No es la cerveza. Es la gente.",
    "Aunque la cerveza tampoco estorba.",
  ],
  [
    "PRÓXIMAMENTE, EN ESTA MISMA SALA",
    "Una idea. Mil maneras de verla.",
    "Una noche sin respuestas precocinadas.",
  ],
  [
    "AVISO DE SALA",
    "Apagamos las prisas. Encendemos la curiosidad.",
    "La película de esta noche la hacemos entre todos.",
  ],
  [
    "NO HACE FALTA SABER DEL TEMA",
    "Una buena pregunta ya es un comienzo.",
    "Aquí también caben los «no lo sé».",
  ],
  [
    "COMUNIDAD EN MARCHA",
    "Tu próximo amigo aún no sabe tu nombre.",
    "Puedes solucionarlo ahora mismo.",
  ],
  [
    "RECETA DE LA CASA",
    "Un poco de humor. Mucho que compartir.",
    "Y cero ganas de parecer importantísimos.",
  ],
  ["HOY ESTÁ PERMITIDO", "Cambiar de opinión.", "No duele tanto como parece."],
  [
    "ESTO NO ES NETWORKING",
    "Es bastante más peligroso: hacer amigos.",
    "Luego viene el grupo de WhatsApp.",
  ],
  ["LA VIDA ES CORTA", "La tabla de quesos, también.", "Tú verás qué haces."],
  [
    "TOLEDO · EN VIVO",
    "Una ciudad. Muchas miradas.",
    "Hoy nos sentamos a escucharlas.",
  ],
  [
    "TRÁILER DE LO QUE VIENE",
    "18 minutos para encender una idea.",
    "Después, la conversación es vuestra.",
  ],
  [
    "NO SE ADMITEN CURRÍCULUMS",
    "Tu teoría absurda sí nos interesa.",
    "Aquí venimos a conocernos de verdad.",
  ],
  [
    "LA MEJOR PARTE",
    "Todavía no ha pasado.",
    "Y puede empezar con un desconocido.",
  ],
  [
    "INGREDIENTES PARA ESTA NOCHE",
    "Curiosidad. Amigos. Alguna pregunta incómoda.",
    "Agitar suavemente. Compartir sin miedo.",
  ],
  [
    "UNA PEQUEÑA PAUSA",
    "Menos pantalla. Más personas.",
    "Nos paramos. Nos encontramos.",
  ],
  [
    "MODO CURIOSIDAD",
    "Pensar distinto tiene buena compañía.",
    "Escuchar también es participar.",
  ],
  [
    "BIENVENIDOS AL THINKGLAO",
    "Aquí nadie trae el guion completo.",
    "Por eso merece la pena.",
  ],
  [
    "PUBLICIDAD DE LA CASA",
    "La salsa secreta no viene en bote.",
    "La estáis haciendo vosotros.",
  ],
  [
    "YA SE NOTA EL AMBIENTE",
    "Las buenas conversaciones están calentando.",
    "Sirve algo. Saluda a alguien.",
  ],
  [
    "CINE DE LAS IDEAS",
    "No hay espectadores de relleno.",
    "Cada persona cambia esta noche.",
  ],
  [
    "UNA NOCHE PARA RECORDAR",
    "Las preguntas también hacen comunidad.",
    "Lo que venga después, mejor descubrirlo juntos.",
  ],
  [
    "SIN MANUAL DE INSTRUCCIONES",
    "Ven como eres.",
    "La curiosidad no exige experiencia previa.",
  ],
];
const seating = [
  [
    "EN UNOS INSTANTES",
    "¡Vamos buscando sitio!",
    "Coge tu bebida. Acércate. Nos vamos sentando.",
  ],
  [
    "LA BOMBILLA ESTÁ LISTA",
    "Toledo, empezamos.",
    "Un último saludo. Una mirada al escenario.",
  ],
  [
    "ÚLTIMA LLAMADA",
    "El fuet puede esperar.",
    "Bueno… un poquito más y nos sentamos.",
  ],
  [
    "NOS VAMOS SENTANDO",
    "Las mejores vistas están cerca.",
    "Deja paso. Haz hueco. Invita a alguien.",
  ],
  [
    "QUE CORRA LA VOZ",
    "La conversación está a punto de encenderse.",
    "18 minutos. Una idea. Toda tu curiosidad.",
  ],
  [
    "AHORA SÍ",
    "Cerveza en mano. Curiosidad preparada.",
    "Nos vemos junto a la bombilla.",
  ],
  [
    "BAJAMOS LAS CONVERSACIONES",
    "Subimos la atención.",
    "Ya casi estamos todos.",
  ],
];
export function visualScene(phase: string, index: number) {
  const pool =
    phase === "montaje" ? montage : phase === "llamada" ? seating : atmosphere;
  const seed = (Math.max(0, index) * 11 + 3) % pool.length;
  return {
    copy: pool[seed],
    layout: (index * 7 + 1) % 4,
    accent: (index * 3 + 1) % 5,
  };
}
export function sceneSeconds(phase: string) {
  return phase === "montaje"
    ? 24
    : phase === "llamada"
      ? 5
      : phase === "salida"
        ? 1
        : 14;
}
