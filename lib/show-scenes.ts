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
montage.push(
  [
    "ESTUDIO DE INGREDIENTES",
    "La salsa empieza por las personas.",
    "El resto lo vamos improvisando.",
  ],
  [
    "DETRÁS DE LA BOMBILLA",
    "Hoy el equipo tiene luz propia.",
    "Gracias por poner el cuerpo y las ganas.",
  ],
  [
    "CUÑA DE LA CASA",
    "Si esto sale bien, será culpa de todos.",
    "Especialmente del que trajo los abridores.",
  ],
  [
    "PRUEBA DE SONIDO",
    "Probando: uno, dos… muchas preguntas.",
    "El micro está casi listo. La curiosidad, siempre.",
  ],
  [
    "PREPARANDO LO EXTRAORDINARIO",
    "Una mano ayuda. Un equipo transforma.",
    "Lo pequeño también hace historia.",
  ],
  [
    "DEPARTAMENTO DE BUEN ROLLO",
    "Buscamos gente que se acerque.",
    "No hace falta enviar currículum.",
  ],
  [
    "LO QUE NO SALE EN EL CARTEL",
    "Todo esto también es el Thinkglao.",
    "El montaje. Las risas. El último cable.",
  ],
  [
    "SERVICIO TÉCNICO DE LA COMUNIDAD",
    "Conectando personas…",
    "Esta conexión no necesita contraseña.",
  ],
  [
    "RECETA SIN MEDIDAS",
    "Un puñado de amigos. Ganas de liarla bien.",
    "Remover con cuidado. Servir en comunidad.",
  ],
  [
    "PREESTRENO",
    "La mejor parte se prepara entre todos.",
    "Esta noche también lleva vuestra firma.",
  ],
  [
    "NOTA DEL DIRECTOR",
    "Nadie monta una buena noche solo.",
    "Por eso estamos aquí.",
  ],
  [
    "APERTURA EN PROCESO",
    "Falta poco. Ya se nota.",
    "Las mesas están listas para otras historias.",
  ],
);
atmosphere.push(
  [
    "INTERMEDIO CULTURAL",
    "No somos expertos en todo.",
    "Pero preguntamos con mucha ilusión.",
  ],
  [
    "PATROCINADO POR LA CURIOSIDAD",
    "La única suscripción es tener ganas.",
    "Sin permanencia. Con posibles amigos.",
  ],
  [
    "CUÑA DE SERVICIO PÚBLICO",
    "Saludar no compromete a una hipoteca.",
    "Puedes probar tranquilamente.",
  ],
  [
    "ATENCIÓN A LA CLIENTELA",
    "Si te quedas sin tema, pregunta.",
    "Nos funciona desde el primer Thinkglao.",
  ],
  [
    "EL SECRETO MEJOR GUARDADO",
    "La salsa tiene nombres y apellidos.",
    "Y alguno acaba de saludarte.",
  ],
  [
    "CARTELERA DE HOY",
    "Acción: conocer a alguien nuevo.",
    "Drama: se ha acabado tu trozo de fuet.",
  ],
  [
    "EN ESTA SALA",
    "Se permite venir sin una gran teoría.",
    "Hasta recomendamos dejarla respirar.",
  ],
  [
    "ÚLTIMA HORA",
    "Pensar en compañía mejora el ambiente.",
    "Seguiremos informando entre cervezas.",
  ],
  [
    "ESTA NOCHE NO HAY EXAMEN",
    "Levanta una pregunta. Baja la guardia.",
    "Lo de tomar apuntes es totalmente opcional.",
  ],
  [
    "PRÓXIMAMENTE",
    "Una conversación que no tenías prevista.",
    "Disponible aquí. En persona. Sin algoritmo.",
  ],
  [
    "LO ESTÁS HACIENDO BIEN",
    "Si ya has saludado a alguien, vas bien.",
    "Si no, todavía estás a tiempo.",
  ],
  [
    "EL AMBIENTE SE CONTAGIA",
    "Haz hueco en tu conversación.",
    "Siempre cabe alguien más.",
  ],
  [
    "AVISO DE NAVEGACIÓN",
    "Has salido de tu burbuja.",
    "Puede que encuentres buenas vistas.",
  ],
  [
    "NO ES MAGIA",
    "Son personas encontrándose.",
    "Aunque a veces se le parece bastante.",
  ],
  [
    "MÁS ALLÁ DEL TRABAJO",
    "Hoy no te preguntamos a qué te dedicas.",
    "Nos interesa qué te hace pensar.",
  ],
  [
    "PREGUNTA DE CALENTAMIENTO",
    "¿Y si el otro tiene un poquito de razón?",
    "No hace falta contestar todavía.",
  ],
  [
    "PUBLICIDAD SIN LETRA PEQUEÑA",
    "La cerveza no piensa por ti.",
    "La compañía ayuda bastante más.",
  ],
  [
    "TENEMOS UN PLAN",
    "Escuchar. Preguntar. Volver a vernos.",
    "Los mejores planes dejan espacio.",
  ],
  [
    "AVISO A LOS CORRILLOS",
    "Vuestra conversación tiene buena pinta.",
    "¿Cabe una persona más?",
  ],
  [
    "ESTRENO EN EXCLUSIVA",
    "La versión de ti que hace una pregunta.",
    "Hoy, en esta misma sala.",
  ],
  [
    "UNA PEQUEÑA REVOLUCIÓN",
    "Menos respuestas rápidas. Más escucha.",
    "Y una mesa donde nos quepamos todos.",
  ],
  [
    "MANUAL DE LA SALSA",
    "No hace falta caerle bien a todo el mundo.",
    "Con empezar a conocernos, nos vale.",
  ],
  [
    "CONEXIÓN ESTABLECIDA",
    "Aquí la cobertura la pone la gente.",
    "Acércate un poco más.",
  ],
  [
    "QUÉ SUERTE COINCIDIR",
    "Podríamos estar en cualquier sitio.",
    "Y hemos elegido encontrarnos aquí.",
  ],
);
seating.push(
  [
    "VAMOS ACERCÁNDONOS",
    "Tu sitio te está esperando.",
    "Coge la bebida. Deja paso. Ven con curiosidad.",
  ],
  [
    "LLAMADA A SALA",
    "El siguiente protagonista es una idea.",
    "Buscamos público con buenas preguntas.",
  ],
  [
    "NOS QUEDA LO MEJOR",
    "Guardamos el móvil. Abrimos la escucha.",
    "Ya se enciende la bombilla.",
  ],
  [
    "CASI LISTOS",
    "Último bocado. Primera fila.",
    "Esta noche empieza de verdad.",
  ],
);
export function visualScene(phase: string, index: number) {
  const pool =
    phase === "montaje" ? montage : phase === "llamada" ? seating : atmosphere;
  const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);
  const step = [11, 13, 17, 19, 23].find((n) => gcd(n, pool.length) === 1) || 1;
  const seed = (Math.max(0, index) * step + 3) % pool.length;
  return {
    copy: pool[seed],
    layout: (index * 7 + 1) % 4,
    accent: (index * 3 + 1) % 5,
    effect: (Math.max(0, index) * 5 + 2) % 8,
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
