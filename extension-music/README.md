# Mezclador externo Thinkglaos

En Edge abre `edge://extensions`, activa Modo desarrollador, pulsa Cargar descomprimida y selecciona esta carpeta `extension-music`. En Chrome se instala desde `chrome://extensions` de la misma manera. Recarga la mesa tras instalarla.

Abre YouTube Music o Spotify web en el mismo navegador y perfil que la mesa. El panel mostrará «Control externo conectado». Al sonar una voz se reduce la música al porcentaje elegido con el deslizador «Música durante la voz» y se recupera al terminar o al pulsar Parar voz.

Solo controla elementos de audio y vídeo de `music.youtube.com` y `open.spotify.com`. No controla Spotify nativo, Windows, otro perfil ni otro navegador. No transmite datos a servicios externos. Las voces siguen sonando aunque la extensión no esté instalada. Los temporizadores de pestañas en segundo plano pueden limitar la suavidad del fundido.

Versión 2.0: recarga la extensión en edge://extensions y después recarga la mesa. La mezcla usa un objetivo único por escena: una intervención ya no puede recuperar música encima de una transición. El título y artista se leen de Media Session. Al sentarse se realiza el relevo desde la pestaña externa a la canción local seleccionada. El volumen externo indicado es el del reproductor; no es un análisis de la forma de onda ni del volumen de Windows.
