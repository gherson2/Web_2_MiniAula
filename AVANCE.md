# Estado de MiniAula — editor de cuestionarios

Rendir/calificar cuestionarios y el panel concentran el trabajo funcional restante.
“Implementado” no reemplaza la comprobación del docente ni la prueba de Docker.

## Funcionalidades incorporadas

El estudiante puede marcar contenido desbloqueado como completado, guardar su
progreso y continuar a la siguiente lección. La API calcula el resumen y el aula
actualiza temario, barra y estado del curso únicamente tras confirmar el guardado.
Repetir una solicitud no duplica filas ni suma otra vez la misma lección.
Los cuestionarios no se pueden completar con ese endpoint: todavía falta rendirlos
y calificarlos en servidor. Un cuestionario anterior sin aprobar mantiene el bloqueo.
Los cambios se hicieron en el proyecto original, no en `Downloads/26`.

“Mis cursos” muestra ahora completadas, total, barra, estado y acciones para empezar,
continuar o repasar. El resumen es privado y usa la misma regla de cálculo del aula.
Se consultan lecciones y progresos por página, sin agregar consultas por cada curso,
y no se devuelven contenidos, claves ni notas.

El instructor puede crear lecciones de cuestionario, definir su nota mínima y
agregar, editar o eliminar preguntas de opción múltiple. El tipo de una lección
ya guardada no cambia. La lista de preguntas es privada y paginada.
Las respuestas correctas solo se guardan en BD: ni crear, editar ni listar las
devuelve. Al editar hay que seleccionar nuevamente la respuesta correcta.
Las preguntas y la nota mínima de cursos con inscritos no se modifican.

## Funcionalidades

| Código | Estado | Evidencia |
|---|---|---|
| RF-01 | Implementado | Registro con nombre, email, contraseña y rol; hash bcrypt |
| RF-02 | Implementado | Login JWT y logout en cliente, sesión persistente |
| RF-03 | Implementado | Perfil propio con edición de nombre/email |
| RF-04 | Implementado | Catálogo publicado, búsqueda, categoría y paginación |
| RF-05 | Implementado | Detalle público con temario sin contenido |
| RF-06 | Implementado | Crear/editar cursos propios; creación solo en borrador |
| RF-07 | Implementado | Publicar/archivar desde el editor |
| RF-08 | Implementado | CRUD de lecciones de contenido, texto y enlace a video |
| RF-09 | Implementado | Ordenar con flechas y validación completa en servidor |
| RF-10 | Implementado | Aula, texto/video de contenido desbloqueado y bloqueo validado en servidor |
| RF-11 | Implementado | Inscribirse desde el detalle, solo estudiante y curso publicado |
| RF-12 | Implementado | Completar contenido desbloqueado y persistir progreso propio |
| RF-13 | Implementado | Lista privada y paginada, porcentaje real, barra y empezar/continuar/repasar |
| RF-14 | Implementado | Cuestionarios, nota mínima y CRUD de preguntas propias con validación |
| RF-15 | Pendiente | Rendir, calificar, aprobar y limitar intentos |
| RF-16 | Pendiente | Resumen de inscritos, promedios y punto de detención |

## Reglas de negocio

| Código | Estado |
|---|---|
| RN-01 | Bloqueo y completado de contenido implementados en servidor; falta flujo de aprobación de cuestionarios |
| RN-02 | Claves no se devuelven por HTTP, tampoco al instructor; falta calificación |
| RN-03 | Pendiente: límite de 3 intentos y mejor nota (campos y CHECK preparados) |
| RN-04 | Implementado: inscripción única, error 409 y bloqueo de concurrencia en PostgreSQL |
| RN-05 | Implementado: catálogo publicado y publicación con mínimo una lección |
| RN-06 | Implementado y probado con inscripción desde API: curso con inscritos no se elimina |
| RN-07 | Implementado en cursos, lecciones y preguntas mediante middleware de propiedad |
| RN-08 | Inscripciones y consulta de progreso privadas; envío de cuestionarios y notas todavía pendiente |

## Base técnica

- Arquitectura routes → controllers → services → modelos Sequelize.
- JWT, bcrypt, middleware de sesión/rol/dueño, Zod, errores normalizados.
- Helmet, CORS con origen configurado, rate limit en autenticación y logs Morgan.
- Configuración por entorno sin subir `.env`.
- Modelos, migración versionada y seed mínimo preparado.
- Swagger para **todos los endpoints implementados**, no para los pendientes.
- React + Vite + Bootstrap, rutas protegidas, Context, Axios, useAuth/useResource.
- Formularios con validación y feedback, estados de carga/error/vacío.
- Dockerfiles y Compose con 3 servicios y volumen. El despliegue anterior fue
   verificado; las actualizaciones posteriores, incluido el editor, están pendientes de probar en Docker.

## Siguiente bloque recomendado

1. Rendir/calificar, máximo 3 intentos y guardar la mejor nota.
2. Panel del instructor.
3. Repetir pruebas con PostgreSQL real y Docker; documentación, video y defensa.

## Verificación de esta etapa

- 52 pruebas de API aprobadas con base de datos aislada en memoria; dos pruebas
  de concurrencia se omiten porque necesitan PostgreSQL real.
- 51 pruebas de frontend aprobadas.
- Recorrido en Edge aprobado: inscripción → Mis cursos → Abrir aula → leer primera
  lección → comprobar siguiente bloqueada → recibir 403 por API y URL directa →
  completar → continuar → recargar y conservar progreso → terminar un curso de contenido.
- Mis cursos comprobado al empezar, guardar progreso y terminar: barras correctas,
  recarga persistente, continuar donde corresponde y repasar sin modificar completados.
- Probada privacidad entre estudiantes, coherencia con el aula, cursos archivados,
  redondeo, curso vacío y número constante de consultas al ampliar la página.
- Editor probado en Edge: crear cuestionario y nota mínima, crear pregunta,
  recargar, editar opciones/clave, eliminar y volver a crear, actualizar nota
  mínima y bloquear la ruta al estudiante. Sin desbordamiento a 375px.
- Comprobado en API: clave no devuelta en POST/PUT/GET, propiedad, rol,
  validación de opciones, paginación y bloqueo de cambios con inscritos.
- Temario y contenido comprobados a 375px sin desbordamiento horizontal.
- Compilación de producción de Vite aprobada.
- Se comprobaron permisos, rechazo de contenido bloqueado, persistencia, repetición
  idempotente, curso completado y prohibición de completar cuestionarios como contenido.
- Los casos de notas reprobadas/aprobadas siguen usando fixtures: rendir y calificar
  cuestionarios aún no están implementados.
- Docker estaba apagado al implementar este editor. **Pendiente**:
  reconstruir contenedores y repetir las 54 pruebas con PostgreSQL real.
- No se modificaron `.env`, volúmenes ni datos locales.

## Evidencia de la versión anterior con inscripciones (no sustituye la nueva comprobación)

- Las 23 pruebas de API aprobadas contra PostgreSQL 16 en Docker, utilizando
  una base temporal independiente que se eliminó al terminar.
- Concurrencia real: 8 inscripciones simultáneas producen una respuesta 201,
  siete respuestas 409 y una única fila en la BD.
- 19 pruebas de frontend aprobadas.
- Recorrido real en Edge aprobado: catálogo, registro/login, borrador, validación
  de publicación, lección, publicación, privacidad, sesión persistente y bloqueo por rol.
- Pantallas comprobadas a 375px sin desbordamiento horizontal.
- Compilación de producción de Vite aprobada.
- `docker compose config --quiet` aprobado.
- Auditoría de dependencias de producción: sin vulnerabilidades conocidas al revisar.
  Existe una advertencia en herramientas de desarrollo del frontend; ver README.
- Despliegue completo de Docker verificado: PostgreSQL 16, API Node y React
  compilado servido por Nginx, los tres servicios saludables.
- Prueba `npm --prefix web run test:docker` aprobada: login, perfil, persistencia
  de sesión al recargar, curso y lecciones, orden, publicación, privacidad y archivo.
  El curso temporal se eliminó sin modificar cursos existentes.
- Migración y seed ejecutados nuevamente dentro del contenedor sin duplicar datos.
- Inscripción y lista de cursos comprobadas en navegador con Nginx y PostgreSQL:
  persistencia al recargar, botón de inscripción ya realizada, rechazo de duplicados,
  permisos y diseño de 375px. Solo se eliminó la inscripción temporal de la prueba.
- En esta máquina se usa un despliegue independiente `miniaula-avance45`:
  frontend en 8081, API en 4001 y BD en 5435. La versión completa de `Downloads/26`
  sigue en 8080 sin cambios. Los ajustes están en `.env`, excluido de Git.
