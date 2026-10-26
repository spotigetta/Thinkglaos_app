# Mezclador Thinkglaos · versión 2.3

En `edge://extensions` activa Modo desarrollador y carga descomprimida la carpeta `extension-music`. Si ya está instalada, pulsa Recargar y acepta los permisos nuevos si Edge lo solicita. Recarga mesa y proyector. Funciona en el mismo navegador y perfil que YouTube Music o Spotify web.

## Vibes sin compartir pantalla

1. Pulsa **Dejar de compartir** en la captura antigua.
2. En la mesa, activa las vibes.
3. Abre la pestaña de YouTube Music o Spotify y pulsa el icono de esta extensión. Puedes fijarlo en la barra de herramientas. El indicador ON confirma la conexión; una segunda pulsación la detiene.
4. Vuelve a la mesa. Las bandas se reciben directamente, sin `getDisplayMedia`, sin vídeo ni selección de una pantalla. El sonido de la pestaña continúa por una única salida. No se graba ni se envía audio fuera del navegador.

La web conserva el método anterior como alternativa si no está instalada la versión 2.3; esa alternativa sí muestra la barra de compartir del navegador. No se ocultan indicadores de seguridad del navegador.

## Proyector

**Abrir proyector** crea una ventana independiente. La extensión consulta los monitores, elige uno secundario activo y coloca esa ventana a pantalla completa. Usa escritorio ampliado de Windows; con un solo monitor se abre allí. La mesa permanece en su ventana. No hace falta conceder el permiso de pantallas a la web.

## Mezcla

Las locuciones reducen el volumen al nivel del deslizador de la mesa. Intro, Charla y Preguntas pausan y silencian la pestaña y bloquean también la salida de audio capturada; pausar el contador mantiene ese bloqueo. Se conserva el estado anterior de silencio y reproducción al salir. No controla aplicaciones nativas, otros perfiles ni otros navegadores.

Implementado con las APIs oficiales [tabCapture](https://developer.chrome.com/docs/extensions/reference/api/tabCapture), [pantallas](https://developer.chrome.com/docs/extensions/reference/api/system/display) y [ventanas](https://developer.chrome.com/docs/extensions/reference/api/windows). Los permisos de captura se activan al pulsar la extensión en la pestaña musical.
