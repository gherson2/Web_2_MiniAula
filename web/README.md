# Frontend de MiniAula

SPA con React, Vite, JavaScript y Bootstrap. Incluye autenticación, perfil,
catálogo, detalle público y editor de cursos/lecciones del instructor.
Incluye inscripción, lista privada y aula del estudiante con lectura de contenido
desbloqueado y temario bloqueado. Permite completar contenido, guardar el progreso,
ver la barra del aula y continuar a la siguiente lección. Mis cursos muestra el
progreso real por tarjeta y permite empezar, continuar o repasar.

El instructor puede crear cuestionarios con nota mínima y acceder a su editor de
preguntas desde el temario. Incluye opciones, selección de clave, creación, edición,
eliminación y paginación. La clave guardada no se recibe de la API: al editar hay
que seleccionarla otra vez.

El estudiante puede responder cuestionarios desbloqueados, consultar su nota y
usar hasta tres intentos. Se conservan la mejor nota y la aprobación al recargar.
El panel del instructor muestra inscritos, progreso promedio, notas promedio y
la primera lección pendiente, sin exponer identidades ni notas individuales.

Consulta el [README principal](../README.md) para Docker, cuentas y alcance.

## Desarrollo

1. `npm ci`
2. Copiar `.env.example` a `.env` si no existe.
3. `npm run dev`

La API debe estar levantada y `VITE_API_URL` debe apuntar a ella.

## Comprobaciones

- `npm test`: componentes, sesión, servicios y rutas.
- `npm run build`: compilación de producción.
- `npm run test:e2e`: prueba de navegador con API/BD de memoria aisladas; requiere
  dependencias instaladas también en `../api`.
- El mismo recorrido admite `E2E_EXTERNAL_URL` y `E2E_ALLOW_WRITE=true` para un
  despliegue externo desechable. Crea datos: no usar sobre una instalación habitual.
  Ver el README principal y `docker-compose.verify.yml` para ejecutarlo con
  Nginx, React compilado, API y PostgreSQL real sin tocar el volumen existente.

El frontend no utiliza datos inventados como sustituto de la API. La lista de
inscripciones, el aula y el guardado de progreso usan el servidor. Solo se actualiza
la interfaz al confirmar la API, también al rendir cuestionarios y consultar estadísticas.
