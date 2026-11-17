# Estado de MiniAula — primera etapa (~40 % orientativo)

No es una nota calculada con la rúbrica: el avance secuencial, los cuestionarios y
el panel concentran una parte importante del trabajo restante.
“Implementado” no reemplaza la comprobación del docente ni la prueba de Docker.

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
| RF-10 | Pendiente | Contenido del estudiante y lecciones bloqueadas |
| RF-11 | Pendiente | Inscripción desde API y frontend |
| RF-12 | Pendiente | Completar lecciones |
| RF-13 | Pendiente | Mis cursos del estudiante y porcentaje de avance |
| RF-14 | Pendiente | Editor de preguntas y nota mínima |
| RF-15 | Pendiente | Rendir, calificar, aprobar y limitar intentos |
| RF-16 | Pendiente | Resumen de inscritos, promedios y punto de detención |

## Reglas de negocio

| Código | Estado |
|---|---|
| RN-01 | Pendiente: bloqueo secuencial validado en servidor |
| RN-02 | Parcial: endpoints públicos no exponen respuestas; falta calificación |
| RN-03 | Pendiente: límite de 3 intentos y mejor nota (campos y CHECK preparados) |
| RN-04 | Parcial: restricción única de inscripción preparada; falta flujo de inscripción |
| RN-05 | Implementado: catálogo publicado y publicación con mínimo una lección |
| RN-06 | Implementado y probado con inscripción de fixture: curso con inscritos no se elimina |
| RN-07 | Implementado en cursos y lecciones; preguntas pendientes |
| RN-08 | Pendiente: aún no existen endpoints de progreso/notas |

## Base técnica

- Arquitectura routes → controllers → services → modelos Sequelize.
- JWT, bcrypt, middleware de sesión/rol/dueño, Zod, errores normalizados.
- Helmet, CORS con origen configurado, rate limit en autenticación y logs Morgan.
- Configuración por entorno sin subir `.env`.
- Modelos, migración versionada y seed mínimo preparado.
- Swagger para **todos los endpoints implementados**, no para los pendientes.
- React + Vite + Bootstrap, rutas protegidas, Context, Axios, useAuth/useResource.
- Formularios con validación y feedback, estados de carga/error/vacío.
- Dockerfiles y Compose con 3 servicios y volumen. Arranque real verificado:
  API, frontend y PostgreSQL saludables.

## Siguiente bloque recomendado

1. Inscripción y acceso por estudiante inscrito.
2. Progreso, completar contenido y desbloqueo secuencial en servidor.
3. Editor de preguntas y nota mínima, sin filtrar respuestas al estudiante.
4. Calificación, máximo 3 intentos y guardar la mejor nota.
5. Mis cursos y panel del instructor.
6. Pruebas con PostgreSQL real y Docker; documentación, video y defensa.

## Verificación de esta etapa

- 17 pruebas de API aprobadas con base de datos aislada en memoria.
- Las mismas 17 pruebas aprobadas contra PostgreSQL 16 en Docker, utilizando
  una base temporal independiente que se eliminó al terminar.
- 10 pruebas de frontend aprobadas.
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
- En esta máquina, `.env` de la raíz configura `DB_PORT=5435` para evitar
  conflictos con servicios locales; ese archivo no se incluye en Git.
