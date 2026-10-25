# Locuciones y proyección

En `?control=1`, el banco contiene las 37 voces del previo y 104 recortes de las tres grabaciones del 25 de octubre.

- Montaje: bromas, voluntarios y relatos de Ramiro, alternados por voz.
- Agradecimiento: discurso final de la voz femenina de la generación 1. El botón lo reproduce entero y al terminar abre Ambientillo. Parar voz cancela ese avance.
- Ambientillo: bienvenida original y generación 2, incluidas las cuñas del cuarto bloque que sirven antes de la charla.
- A sentarse: las siete llamadas originales.
- Pizzas: conversación, after y relatos. Las frases que hablan de una charla ya terminada solo entran aquí.
- Charla, preguntas, intro y cuenta atrás: no se lanzan cuñas automáticas.

La frecuencia es una pausa de 10 a 240 segundos **desde que termina** cada audio. Los botones Más / Normal / Menos fijan 20 / 60 / 120 segundos. Siguiente frase permite intervenir manualmente. La búsqueda y el filtro por momento conservan acceso a todos los recortes. Frecuencia y animación se recuerdan en el navegador; los automatismos comienzan desactivados al abrir una mesa nueva.

Una cuña de reuniones previas viene incompleta en el WAV (`oct25-g1-s1-29.mp3`): se conserva con aviso, solo para reproducción manual. Los cuatro relatos contienen improvisaciones respecto al guion; sus introducciones y remates se conservan completos.

El selector Animaciones del proyector controla explícitamente esta salida, incluso si Windows solicita movimiento reducido. El resto de la aplicación respeta esa preferencia. Desactivarlo o pausar detiene el movimiento sin ocultar los textos. La prueba de navegador verifica movimiento real de la cinta con la preferencia del sistema simulada.

## Preparación de los recortes

`scripts/prepare-oct25-narration.py` usa los WAV y el Markdown originales en la carpeta superior, transcripciones locales con marcas de palabra bajo `.local/Generated Audio ... .json`, NumPy y ffmpeg local. Alinea guion y palabras, busca mínimos de energía entre frases, extrae muestras PCM por posición exacta y aplica fundidos de 10/20 ms en los bordes. Los relatos incluyen límites revisados para conservar las improvisaciones. No sobrescribe los originales.

Se publica `public/media/locuciones-oct25.json` y los MP3 correspondientes. Las herramientas, transcripciones de trabajo y originales WAV no se incluyen en Pages.
