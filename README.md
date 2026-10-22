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

Cada edición se muestra al instante y se guarda automáticamente en data mediante la API de GitHub, sin desplegar Pages. La app consulta al entrar, al volver al primer plano, al recuperar conexión y cada 15 segundos. GitHub puede tardar algunos segundos; no es una conexión en tiempo real por sockets.

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

El ZIP original sigue en la carpeta superior. Los componentes anteriores se conservan localmente en .local/original-components. Los vídeos y fotografías no se han subido automáticamente.

## Configuración pendiente del equipo

1. Invitar a los embajadores como colaboradores de escritura en Settings → Collaborators. Cada uno conecta su token limitado al repositorio desde su dispositivo. Los voluntarios no necesitan token.
2. Completar fecha, espacio, ponente y nombres visibles reales. Los nombres iniciales son puestos de trabajo.
3. Para IA generativa, añadir una clave activa en Preguntas → Configurar IA, en cada sesión. La búsqueda documental funciona sin clave. Una clave compartida requeriría un servicio privado: una web pública de Pages no puede ocultarla.
4. Añadir los enlaces de vídeos de sesión/promoción cuando se decida su alojamiento. Hay vídeos de más de 100 MB que permanecen en el archivo local.

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
