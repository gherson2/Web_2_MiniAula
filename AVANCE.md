# Estado de MiniAula — aula del estudiante (~50 % orientativo)

No es una nota calculada con la rúbrica: el avance secuencial, los cuestionarios y
el panel concentran una parte importante del trabajo restante.
“Implementado” no reemplaza la comprobación del docente ni la prueba de Docker.

## Incremento de esta entrega

Se añade un bloque orientativo de 5 puntos porcentuales sobre el avance del 45 %:
aula del estudiante, lectura de contenido y video, temario con estados de acceso,
autorización por inscripción y bloqueo secuencial en servidor.
La primera lección está disponible al inscribirse. El servidor interpreta las filas
de progreso existentes y exige aprobar un cuestionario previo para seguir.
Todavía NO se implementa completar lecciones ni rendir cuestionarios: sin progreso
guardado, solo se puede leer la primera lección. No se simulan acciones completadas.
Los cambios se hicieron en el proyecto original, no en `Downloads/26`.

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
| RF-12 | Pendiente | Completar lecciones |
| RF-13 | Parcial | Lista privada y paginada de cursos inscritos; falta porcentaje de avance |
| RF-14 | Pendiente | Editor de preguntas y nota mínima |
| RF-15 | Pendiente | Rendir, calificar, aprobar y limitar intentos |
| RF-16 | Pendiente | Resumen de inscritos, promedios y punto de detención |

## Reglas de negocio

| Código | Estado |
|---|---|
| RN-01 | Bloqueo de lectura implementado en servidor; falta el flujo que guarda completados/aprobación |
| RN-02 | Parcial: endpoints públicos no exponen respuestas; falta calificación |
| RN-03 | Pendiente: límite de 3 intentos y mejor nota (campos y CHECK preparados) |
| RN-04 | Implementado: inscripción única, error 409 y bloqueo de concurrencia en PostgreSQL |
| RN-05 | Implementado: catálogo publicado y publicación con mínimo una lección |
| RN-06 | Implementado y probado con inscripción desde API: curso con inscritos no se elimina |
| RN-07 | Implementado en cursos y lecciones; preguntas pendientes |
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
- Dockerfiles y Compose con 3 servicios y volumen. El arranque del 45 % fue
  verificado; el nuevo código del aula está pendiente de reconstruir/probar en Docker.

## Siguiente bloque recomendado

1. Completar contenido, guardar progreso y actualizar el desbloqueo.
2. Porcentaje en “Mis cursos”.
3. Editor de preguntas y nota mínima, sin filtrar respuestas al estudiante.
4. Calificación, máximo 3 intentos y guardar la mejor nota.
5. Panel del instructor.
6. Repetir pruebas con PostgreSQL real y Docker; documentación, video y defensa.

## Verificación de esta etapa

- 29 pruebas de API aprobadas con base de datos aislada en memoria; una prueba
  de concurrencia se omite porque necesita PostgreSQL real.
- 28 pruebas de frontend aprobadas.
- Recorrido en Edge aprobado: inscripción → Mis cursos → Abrir aula → leer primera
  lección → comprobar siguiente bloqueada → recibir 403 por API y URL directa.
- Temario y contenido comprobados a 375px sin desbordamiento horizontal.
- Compilación de producción de Vite aprobada.
- Se comprobaron privacidad entre estudiantes, rechazo sin inscripción y lectura
  de progreso de prueba, incluido cuestionario reprobado/aprobado, sin exponer claves.
  Los progresos de prueba son fixtures, no un endpoint de completar ya implementado.
- Docker estaba apagado al implementar el aula. **Pendiente**: reconstruir los
  contenedores y repetir las 30 pruebas con PostgreSQL real (incluida concurrencia).
- No se modificaron `.env`, volúmenes ni datos locales.

## Evidencia anterior del avance del 45 % (no sustituye la nueva comprobación)

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
