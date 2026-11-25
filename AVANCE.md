# Estado de MiniAula — evaluaciones y estadísticas

RF-01 a RF-16 implementados y versión actual verificada en Docker/PostgreSQL.
Pendientes las evidencias de entrega y la comprobación en la máquina del docente.

## Funcionalidades incorporadas

El estudiante puede marcar contenido desbloqueado como completado, guardar su
progreso y continuar a la siguiente lección. La API calcula el resumen y el aula
actualiza temario, barra y estado del curso únicamente tras confirmar el guardado.
Repetir una solicitud no duplica filas ni suma otra vez la misma lección.
Los cuestionarios se rinden y califican en servidor con un endpoint separado.
Un cuestionario anterior sin aprobar mantiene el bloqueo.
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

El estudiante responde preguntas seguras, sin claves, en el aula. La API valida
una respuesta por pregunta, califica y guarda hasta tres intentos bajo bloqueo
de inscripción. Conserva la mejor nota y la aprobación aunque un intento posterior
sea menor. El umbral se compara sin redondear y la nota mostrada es entera.
Publicar y admitir inscritos exige preguntas en todos los cuestionarios.

El panel del instructor propietario muestra inscritos, completados, progreso
promedio, mejor nota promedio de cuestionarios intentados y primera lección
pendiente. No publica identidades ni notas individuales. Sin intentos la nota es
null; sin inscritos el progreso es 0. La detención no implica abandono.

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
| RF-15 | Implementado | Rendir, calificar, aprobar, tres intentos y mejor nota persistida |
| RF-16 | Implementado | Panel privado: inscritos, promedios y primera lección pendiente |

## Reglas de negocio

| Código | Estado |
|---|---|
| RN-01 | Bloqueo secuencial, completado y aprobación implementados en servidor |
| RN-02 | Claves solo internas; calificación en servidor sin devolver correcciones |
| RN-03 | Máximo tres intentos y mejor nota bajo transacción y bloqueo de inscripción |
| RN-04 | Implementado: inscripción única, error 409 y bloqueo de concurrencia en PostgreSQL |
| RN-05 | Implementado: catálogo publicado, mínimo una lección y cuestionarios con preguntas |
| RN-06 | Implementado y probado con inscripción desde API: curso con inscritos no se elimina |
| RN-07 | Implementado en cursos, lecciones y preguntas mediante middleware de propiedad |
| RN-08 | Inscripciones, progreso, respuestas y notas privados; estadísticas agregadas solo del dueño |

## Base técnica

- Arquitectura routes → controllers → services → modelos Sequelize.
- JWT, bcrypt, middleware de sesión/rol/dueño, Zod, errores normalizados.
- Helmet, CORS con origen configurado, rate limit en autenticación y logs Morgan.
- Configuración por entorno sin subir `.env`.
- Modelos, migración versionada y seed mínimo preparado.
- Swagger para todos los endpoints implementados, incluidos intentos y resumen.
- React + Vite + Bootstrap, rutas protegidas, Context, Axios, useAuth/useResource.
- Formularios con validación y feedback, estados de carga/error/vacío.
- Dockerfiles y Compose con 3 servicios saludables y volumen conservado.
- `docker-compose.verify.yml`: despliegue temporal desde cero con PostgreSQL real
  sobre tmpfs, sin montar el volumen habitual ni publicar la BD.

## Pendiente antes de entregar

1. Repetir la demostración en la máquina del docente antes de la defensa.
2. Agregar el enlace al video, a cargo del usuario.
3. Completar contribuciones y revisiones reales en pareja, y preparar defensa individual.
4. Crear el tag de entrega solo después de verificar; no se hicieron commits ni push automáticos.

## Verificación de esta etapa

- 60 pruebas de API aprobadas con base de datos aislada en memoria; tres pruebas
  de concurrencia se omiten porque necesitan PostgreSQL real.
- 61 pruebas de frontend aprobadas.
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
- Probado en API: reprobar, aprobar, mejor nota ante un fallo posterior, límite
  de tres intentos, respuestas inválidas sin consumo, umbral exacto, mínimo cero,
  preguntas seguras, secuencia y curso completado.
- Panel probado con cero datos y dos estudiantes, permisos del dueño y agregados.
- Edge comprobó reprobar → recargar → aprobar → recargar → tercer intento menor,
  mejor nota y aprobación conservadas, curso completado y panel a 375px.
- Verificación actualizada el 25 de noviembre de 2026:
  - `docker compose up --build -d --wait` aprobado; tres servicios saludables.
  - 63 pruebas de API aprobadas contra PostgreSQL 16 real, ninguna omitida.
    Base temporal independiente creada y eliminada al finalizar.
  - Concurrencia: ocho inscripciones crean una sola fila; completar simultáneamente
    no duplica progreso; seis envíos de cuestionario aceptan tres y rechazan tres.
  - Se ajustó el curso de prueba de inscripciones concurrentes para incluir una
    lección, conforme a la validación que impide inscribirse en cursos vacíos.
  - `test:docker` aprobado sobre el despliegue habitual en 8081; curso temporal
    eliminado sin modificar cursos existentes.
  - Recorrido completo aprobado en despliegue Docker temporal desde cero:
    Nginx, React compilado, API y PostgreSQL real. Incluye autoría, inscripción,
    bloqueo, contenido, reprobar/aprobar, recarga, tres intentos, mejor nota y panel.
    Comprobado a 375px sin desbordamiento ni excepciones del navegador.
  - Despliegue temporal detenido y eliminado; su BD desechable no usa volúmenes.
  - Recorrido en memoria repetido y aprobado después de agregar el modo externo.
- pg-mem omite SET TRANSACTION ISOLATION LEVEL: no demuestra aislamiento,
  rollback ni concurrencia reales. Producción siempre usa PostgreSQL.
- No se modificaron `.env` ni se eliminaron volúmenes o datos existentes.

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
