# Thinkglaos · Toledo

Aplicación de organización de IT’S TIME TO THINK. La misma aplicación en ordenador y móvil, instalable como PWA.

Aplicación: https://spotigetta.github.io/Thinkglaos_app/

## Acceso y permisos

- Voluntarios: consulta por enlace sin token. Pueden leer todas las tarjetas e instrucciones, buscar en el manual, consultar IA y preguntar al equipo mediante GitHub Issues. Para preguntas compartidas necesitan su propia cuenta de GitHub, sin acceso de escritura al tablero.
- Embajadores: cuenta propia de GitHub con permiso de escritura en este repositorio. En «Acceso de embajadores», conectar un token limitado solo a Thinkglaos_app con Contents: read and write. La app verifica la identidad y GitHub aplica los permisos al guardar.
- Cambiar el rol en el directorio no concede permisos de edición. El token se guarda por sesión, o expresamente en un dispositivo de confianza; nunca se publica ni se incluye en commits. Cada embajador usa su propia credencial.

El tablero es público por decisión del propietario: usar nombres visibles o alias, no teléfonos ni datos privados. Los documentos originales de investigación y las fotos de personas permanecen fuera de la publicación.

## Sincronización

| Rama     | Uso                                                                                                    |
| -------- | ------------------------------------------------------------------------------------------------------ |
| main     | Código y documentación.                                                                                |
| gh-pages | Aplicación compilada. Pages publica desde esta rama y su carpeta raíz, sin workflow de Actions propio. |
| data     | data/state.json y uploads/: datos editados desde ordenador y móvil.                                    |

Cada edición se muestra al instante y se guarda automáticamente en data mediante la API de GitHub, sin desplegar Pages. La app consulta el estado actual al entrar, al volver al primer plano y al recuperar conexión. Con cuenta conectada comprueba cada 15 segundos. La consulta pública combina comprobaciones de fondo cada 15 segundos con una lectura de la API cada 75 segundos para respetar su límite anónimo; el botón de sincronización fuerza esta lectura actual. Nunca se sustituye una revisión nueva por una respuesta antigua de caché. GitHub puede tardar algunos segundos; no es una conexión en tiempo real por sockets.

Los cambios se encolan por entidad y campo, con identificadores estables. Antes de guardar se lee el SHA actual; ante conflicto se relee y aplica la cola al estado nuevo. Se conservan ediciones de campos distintos; si dos personas modifican el mismo campo, gana la última escritura aplicada. Una edición de una tarjeta eliminada no la recupera. Las operaciones confirmadas no se repiten.

Sin conexión se conserva la última copia y la cola local. Se indica «Guardado en este dispositivo» hasta completar la subida. La cola sobrevive al cierre del navegador y solo se reanuda con la cuenta que la creó. Exportar copia descarga los datos y la cola sin credenciales.

## Funciones

- Las 24 tareas del ZIP, con sus cinco fases, roles, instrucciones y avisos, más cuatro tareas previas del manual que faltaban.
- Tareas con responsable, fecha, instrucciones y lista de comprobación: añadir, editar, completar, reabrir y eliminar.
- Plan, flujo y equipo; filtros, búsqueda, zoom y fases plegables.
- Eventos independientes con fecha, espacio, ponente, aforo previsto, horario y entradas. Un evento nuevo crea su propia plantilla de tareas sin reiniciar los anteriores.
- Thinknómetro de 18 minutos y preguntas de 45 minutos; pausa y reinicio. Es local a cada dispositivo.
- Directorio del equipo y seguimiento de espacios candidatos. Las condiciones de los informes históricos no se presentan como acuerdos confirmados.
- Manual completo, guías, notas, enlaces y archivos. Subidas desde móvil hasta 5 MB; para vídeos se añaden enlaces a su alojamiento. Quitar un recurso del tablero no elimina el archivo ya subido ni su histórico.
- Consultas con fuentes y Markdown seguro. Gemini opcional, con clave de sesión y modelo configurable. El asistente no modifica el tablero.
- Importación de las tareas antiguas del almacenamiento local, si se detectan en ese navegador y el embajador lo solicita.

## Documentación de origen

npm run prepare:data inventaría los once Markdown y conserva copias íntegras en .local/source-documents, ignorada por Git. Publica el inventario con hashes y contexto operativo revisado, junto al manual completo del ZIP. Los informes contienen fechas pasadas, propuestas contradictorias y estimaciones: los espacios se importan como Por validar. Las cifras de expansión del manual son históricas.

El ZIP original sigue en la carpeta superior. Los componentes anteriores se conservan localmente en .local/original-components. Las fotografías personales no se publican. Los cinco vídeos de sesión y promoción se publican, por petición del propietario, en [GitHub Releases](https://github.com/spotigetta/Thinkglaos_app/releases/tag/videos-originales-2026-10) como archivos originales sin conversión ni recompresión. `media/videos.json` registra sus enlaces, tamaños y huellas SHA-256 verificadas contra GitHub.

## Configuración pendiente del equipo

1. Invitar a los embajadores como colaboradores de escritura en Settings → Collaborators. Cada uno conecta su token limitado al repositorio desde su dispositivo. Los voluntarios no necesitan token.
2. El equipo está actualizado con Alejandro Zamora, Teresa Peteiro, Daniel Ramírez, Juan María, Helena Palomino y María Marcos como voluntarios, y Pablo Ramírez y Javier Yuste como embajadores. Próximo encuentro: jueves 29 de octubre de 2026 a las 20:00, Claustro Santo Tomé, con Laura Rodríguez Rivero. Pablo conserva el material anterior. Estos datos constan en `data/state.json`; las tarjetas conservan su estado y no se asignan personas a tareas sin indicación del equipo.
3. Para IA generativa, añadir la clave en Preguntas → Configurar IA. Se puede recordar expresamente en el dispositivo de confianza. El modelo inicial es `gemini-3.5-flash-lite`, comprobado con una consulta real, y las respuestas se limitan normalmente a 2–4 frases o viñetas. El contexto incluye evento, equipo, tareas y estados, materiales y custodia, espacios, manual y borradores de comunicación. La clave no se publica en código ni en datos. Una única clave compartida sin configurarla en cada dispositivo requeriría un servicio privado que la custodie.
4. Los vídeos originales ya están enlazados en Manual y material. Para volver a publicar y verificar este material, ejecutar `node scripts/publish-videos.mjs`: reutiliza los archivos idénticos, comprueba sus huellas y conserva los demás recursos del tablero.

La pestaña **Textos WhatsApp** aparece al conectar como embajador. Incluye promoción, explicación del formato, voluntariado/comunidad, colaboradores y ponentes. Se generan borradores con los datos del evento activo, se pueden copiar sin enviar, y las personalizaciones se guardan por evento mediante la sincronización existente. Los nombres del directorio no conceden acceso de escritura a GitHub.

## Experiencia del equipo

La interfaz mantiene el negro y amarillo de Thinkglao con ventanas flotantes y transiciones deslizantes entre secciones. Las tarjetas entran de forma escalonada, las ventanas tienen apertura y cierre animados y completar una tarea produce una celebración breve. Se respeta `prefers-reduced-motion`; los cambios de datos en segundo plano no reinician la navegación ni las animaciones de todas las tarjetas.

«Tu parte del Thinkglao» permite elegir un nombre en este dispositivo para ver pendientes y el siguiente paso. Es una vista de consulta, no un inicio de sesión ni un cambio de permisos. En móvil aparece antes de la invitación. Los embajadores pueden pulsar **Asignar persona** en cada tarjeta: se muestran los miembros y su carga pendiente, y pueden añadir una persona y asignarla en el mismo recorrido. **Añadir miembro** permite incorporar uno o varios nombres, ignorando duplicados por tildes, mayúsculas o espacios. La función «Embajador» del directorio sigue sin conceder permisos técnicos.

La invitación muestra la cuenta atrás real del evento en días de Madrid y el tamaño del equipo registrado. **Comparte el Thinkglao** abre la hoja nativa de compartir o copia el texto de promoción. Ningún mensaje se envía automáticamente; no se inventan ventas, entradas disponibles ni asistencia.

## Desarrollo y despliegue

    npm install
    npm run check
    npm run build
    npm run dev

Pruebas en Chrome con el servidor local en el puerto 3000:

    npx playwright test

Publicación:

    git add .
    git commit -m "Actualizar Thinkglaos"
    git push origin main
    npm run deploy
    git -C .pages-worktree push -u origin gh-pages

scripts/github-admin.mjs usa las credenciales del gestor Git, solo en memoria, para configurar Pages, consultar su estado e inicializar la rama de datos sin sobrescribir una existente. prepare:data no modifica el tablero compartido ni sustituye un seed.json existente.

Vista móvil y plan operativo (octubre 2026): cuatro fases — Organizar, Esa tarde, Durante y Fin. Tarjetas breves con hora y responsable; las instrucciones y listas se abren en el detalle. Las horas de montaje son propuestas, salvo el horario oficial del encuentro 20:00–23:30. La hora de cada tarea se puede editar. Más agrupa las secciones secundarias en móvil.

Descubrir muestra carteles oficiales en un carrusel con desplazamiento y enlaces a los encuentros, al canal de Shorts y a vídeos completos. Es una selección consultada el 22/10/2026, no un feed en directo. Las frases son textos originales de la aplicación, sin atribuciones inventadas.

scripts/update-operating-plan.ts migra los datos compartidos mediante SHA y copia local de seguridad, mantiene responsables, estados y checks asociados a instrucciones idénticas, y conserva las instrucciones anteriores en los detalles. No modifica documentos fuente. El tablero utiliza la rama data y no necesita desplegar la interfaz para sincronizar las tareas.
