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

## Nivel de voz

La mesa reproduce copias en `media/voces-master-v1`, conservando los recortes originales. `scripts/normalize-show-voices.py` mide las 141 cuñas y Manolo, aplica ganancia constante hacia −16 LUFS con un limitador con sobremuestreo y vuelve a medir cada archivo publicado. `media/voice-master-v1.json` registra los niveles anteriores, posteriores y los picos reales. Tras regenerar recortes, hay que regenerar también los masters.

El refuerzo de voz de la mesa va del 50 al 300%, comienza al 150% y usa un compresor para controlar picos. El medidor de la cabecera mide la señal después del refuerzo. El ajuste se recuerda en este navegador. El nivel habitual de música durante las voces comienza al 12% del volumen normal y sigue siendo editable; el volumen de voz y de música tienen recorridos independientes.

## Mesa de directo unificada (26 octubre)

La mesa muestra simultáneamente escena/tiempo, mezcla e intervenciones. Pulsa **Activar mesa** una vez para habilitar audio. Voces automáticas, transición a sentarse y mezcla externa están marcadas inicialmente; los vídeos de prueba están apagados. **PARAR TODO** cancela automatismos y devuelve la música externa a su volumen original.

Al entrar en **A sentarse**, la pestaña musical baja mientras entra la canción local seleccionada. Las voces reducen únicamente esa cama musical; al terminar recuperan el objetivo de la escena, nunca el de una fase anterior. Acelerar funde la canción durante 7,5 segundos; la intro conserva silencio de fondo. Pizzas vuelve a liberar la pestaña musical. La mezcla usa una política única y fundidos por reloj real, independientes del dibujo y del foco de Edge.

### Extensión 2.0
Recarga la extensión descomprimida en `edge://extensions` (botón circular Actualizar/Recargar en su tarjeta) y recarga la mesa. Si usas el ZIP, sustituye la carpeta extraída por `public/downloads/thinkglaos-mezclador.zip` y recarga la extensión. No uses simultáneamente dos mesas antiguas. La extensión obtiene título/artista de Media Session y controla solo Spotify web/YouTube Music del mismo perfil. No controla el volumen global del ordenador ni Spotify nativo.

Los medidores de voz, música local e intro leen señal real. La salida app representa la suma conservadora de picos de esos canales: no es el volumen del sistema. La pestaña externa muestra su volumen comunicado; no se presenta como una señal medida. El disco gira cuando la extensión informa de reproducción.

El botón de vídeo de prueba reproduce un short del catálogo oficial durante un máximo de 30 s. Baja la cama solo cuando YouTube confirma reproducción, recupera en pausa/buffering/fin/error y permite cortar al instante desmarcando la prueba. El reproductor usa la API oficial: https://developers.google.com/youtube/iframe_api_reference. Si el proveedor bloquea reproducción automática, se cancela la intervención y se recupera la música.

Al agotarse los 18 minutos de charla y durante Pizzas aparece un QR grande generado localmente, con el enlace exacto del grupo de WhatsApp. El logo ITTT permanece visible.

### Montaje hasta las 19:25
La mesa reparte automáticamente las 55 locuciones de montaje hasta las 19:25, hora de Madrid. Cuenta la duración real de cada corte y divide el tiempo restante entre las frases todavía pendientes; ninguna se repite. Al terminar cada frase, al continuar tras una pausa o al empezar más tarde recalcula los silencios. Cuando ya no cabe una frase completa antes de las 19:25, deja de iniciarla. El control manual de frecuencia se conserva para el ambientillo y las demás escenas. **Reiniciar** vuelve a incluir todas las frases de montaje desde la hora actual.

### Contadores de charla y preguntas
La mesa permite pausar, continuar, mover la posición ±30 segundos o con el deslizador, y reiniciar. Al reiniciar un contador queda en 18:00 o 45:00 **en pausa**, listo para continuar. Al llegar naturalmente a cero se detiene, permanece en esa escena y suena una melodía instrumental original de 30 segundos; cambiar de escena sigue siendo manual. Mover el control directamente a cero no dispara la alarma. El proyector muestra el cartel de Laura sobre un fondo dinámico durante los contadores, sin reloj de pared. El banco de frases forma parte del desplazamiento normal de la mesa y el acceso «Frases ↓» salta a él.


### Escenas ITTT y pizzas
Los cronómetros usan amarillo ITTT intenso con tipografía negra. «Modo oscuro de cronómetros» invierte el fondo a negro y los números a amarillo; se sincroniza con el proyector y queda guardado. «Probar aviso musical · 30 s» reproduce una melodía original de caja de música de 30 segundos, con acompañamiento de vals y limitación de picos. La intro se muestra sin reloj ni logo superpuestos.

Pizzas reparte sus locuciones durante 60 minutos de escena, contando las duraciones de audio y sin repetir frases. Al pausar también se pausa ese plazo; al reiniciar vuelve a repartirlas desde el principio. El QR queda en una tarjeta lateral amarilla y las frases cambian cada 14 segundos a su lado, también al acabar la charla. El código QR permanece legible tras la entrada inicial de la tarjeta.


### Paleta del logo y aviso de treinta segundos
El color de fondo se ha medido en `Logo.jpg`: RGB 254, 225, 133 (`#FEE185`), con negro (`#000000`). Ese amarillo se aplica al fondo en modo claro y a las cifras en modo oscuro. La melodía de fin dura 30 segundos. El botón **Detener aviso** está en la cabecera fija y cancela tanto las notas actuales como las programadas, con un fundido breve. También la detienen Reiniciar, ajustar el tiempo, cambiar de escena y Parar todo. Es una composición original de aire de cuento.

### Pausas e intro con volumen equilibrado
La mezcla de Intro, Charla, Preguntas, A sentarse y Pantalla compartida conserva la música externa a cero, independientemente del estado del reloj y del interruptor de música local. Si se pausa una locución de otra escena, mantiene la música baja y Continúa retoma esa misma voz. La extensión 2.1 reafirma periódicamente el objetivo de volumen y rechaza restauraciones antiguas. Hay que recargarla en edge://extensions y recargar la mesa.

La intro reproduce el archivo original `media/intro-thunder.mp4`, con un refuerzo general al 200% (+6 dB), ajustable hasta el 300%. El mismo refuerzo se aplica a todo el vídeo y conserva las diferencias entre sus tramos, incluido el reservado para hablar después de los 20 segundos. El control Intro es independiente de Voces y mantiene protección de picos. El original se verifica por SHA-256 en las pruebas.


### Vibes musicales
«Vibes al ritmo de la música» viene apagado. Al activarlo, se aplica por defecto a A sentarse y aceleración. Escenas permite extenderlo al previo, pizzas, cronómetros o al conjunto de escenas; la intro y la pantalla compartida permanecen limpias. Los estilos son halos, contraste/inversión, anillos y figuras, ondas o mezcla de estilos. Umbral controla qué señal dispara el efecto (más bajo, más pulsos); Intensidad regula su presencia. «Probar pulso» permite previsualizarlo. El detector mide graves y energía de la música, con separación mínima de 400 ms entre pulsos.

La música local se analiza directamente y no necesita configuración adicional. Para YouTube Music o Spotify, pulsa **Conectar audio de YouTube / Spotify**, elige su pestaña y marca **Compartir audio**. La captura se analiza localmente para los efectos, sin añadir otra reproducción de sonido. Desactivar Vibes o pulsar Desconectar detiene la captura. La señal llega al proyector por el canal local que ya usa la mesa; los efectos no cambian la mezcla ni el volumen. Referencia de la selección de pestaña y audio: https://developer.chrome.com/docs/web-platform/screen-sharing-controls


### Flash de inversión total
El estilo preferido al activar Vibes es **Flash · inversión total**. Invierte al 100% toda la imagen y vuelve directamente al color original, sin mezcla de grises. Duración del flash permite elegir entre unos 60 y 180 ms (120 ms en el centro del deslizador). Los otros estilos conservan su ajuste de intensidad. La detección se centra más en los graves y sus subidas de energía, toma muestras cada 25 ms y permite seguir golpes de 120–125 bpm sin saltarse uno de cada dos. Un tono sostenido no dispara flashes repetidos. Los efectos siguen su propio tiempo aunque pauses el contador; apagar Vibes retira el efecto inmediatamente.
