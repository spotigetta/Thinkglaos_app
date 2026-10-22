import type { State } from "./model";
export function whatsappTemplates(state: State, eventId: string) {
  const event = state.events.find((e) => e.id === eventId),
    date = event?.date
      ? new Date(event.date + "T12:00:00").toLocaleDateString("es-ES", {
          weekday: "long",
          day: "numeric",
          month: "long",
        })
      : "fecha por confirmar",
    place = event?.venue || "espacio por confirmar",
    city = event?.city || "Toledo",
    speaker = event?.speaker || "ponente por confirmar",
    time = event?.start || "hora por confirmar";
  const details = `📅 ${date}\n🕗 ${time}\n📍 ${place}, ${city}\n🎙️ ${speaker}`,
    tickets = event?.ticketsURL
      ? `\n🎟️ Entradas: ${event.ticketsURL}`
      : "\n¿Te vienes? Escríbenos y te contamos cómo apuntarte.";
  return [
    {
      id: "promotion",
      title: "Promocionar el próximo Thinkglao",
      audience: "Para compartir y mover el encuentro",
      text: `💡 ¡${city}, tenemos Thinkglao!\n\nUna charla que te mueve ideas, preguntas sin miedo y una comunidad con ganas de conversar. Y sí: barra libre de cerveza para seguir la conversación.\n\n${details}\n\n18 minutos para pensar. Después, el diálogo lo construimos entre todos.${tickets}`,
    },
    {
      id: "explain",
      title: "Explicar qué es Thinkglao",
      audience: "Para quien todavía no nos conoce",
      text: `💡 Thinkglao es un encuentro de IT’S TIME TO THINK: una comunidad para parar un rato, pensar y conocer gente.\n\nNos reunimos en un ambiente cercano, escuchamos una charla de 18 minutos y abrimos unos 45 minutos de preguntas. Después seguimos conversando, con barra libre de cerveza.\n\nNo hace falta saber del tema: basta con venir con curiosidad. La idea es salir con una buena conversación y alguna pregunta nueva.`,
    },
    {
      id: "volunteers",
      title: "Invitar a voluntarios y crear comunidad",
      audience: "Para sumar personas al equipo local",
      text: `💛 Estamos montando comunidad Thinkglao en ${city} y nos encantaría contar contigo.\n\nSer voluntario es ayudar a que el encuentro pase: preparar el espacio, recibir a la gente, apoyar con las entradas, el material o los vídeos. Cada persona puede aportar algo, y repartimos las tareas con tiempo.\n\nPróximo encuentro:\n${details}\n\nMás que echar una mano un día, buscamos un equipo con ganas de conocerse y construir algo juntos. ¿Te apetece sumarte?\n\nLo coordinan Pablo Ramírez y Javier Yuste.`,
    },
    {
      id: "partners",
      title: "Proponer colaboración a un partner",
      audience: "Para espacios, anfitriones y colaboradores",
      text: `Hola, somos el equipo de Thinkglao ${city}, de IT’S TIME TO THINK.\n\nCreamos encuentros de pensamiento y conversación para jóvenes: una charla breve, preguntas del público y un momento social en un ambiente cercano. Buscamos colaboradores que compartan esa forma de crear comunidad y activar la cultura local.\n\nNuestro próximo encuentro es el ${date} a las ${time}, en ${place}, con ${speaker}.\n\nNos gustaría explorar qué colaboración podría encajar con vosotros, respetando la identidad de ITTT y acordando las condiciones antes de comprometernos. ¿Podemos hablar unos minutos?\n\nPablo Ramírez y Javier Yuste · Embajadores Thinkglao ${city}`,
    },
    {
      id: "speakers",
      title: "Invitar o explicar el formato a un ponente",
      audience: "Para una primera conversación con un ponente",
      text: `Hola, ¿qué tal? Somos Pablo Ramírez y Javier Yuste, embajadores de Thinkglao ${city}, de IT’S TIME TO THINK.\n\nNos gustaría hablar contigo sobre una posible participación en uno de nuestros encuentros. El formato es cercano: 18 minutos para compartir una idea que haga pensar y unos 45 minutos de preguntas y conversación con el público. Después seguimos charlando de manera informal.\n\nBuscamos una voz con algo que contar, más que una conferencia convencional. La fecha, el tema y las condiciones se acuerdan contigo y con ITTT. ¿Te apetecería que lo comentáramos?`,
    },
  ];
}
