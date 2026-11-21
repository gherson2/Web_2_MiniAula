# Frontend de MiniAula

SPA con React, Vite, JavaScript y Bootstrap. Incluye autenticación, perfil,
catálogo, detalle público y editor de cursos/lecciones del instructor.
Este incremento incorpora inscripción y lista privada de cursos para estudiantes,
sin implementar todavía el porcentaje de avance ni las lecciones del estudiante.

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

El frontend no utiliza datos inventados como sustituto de la API. La lista de
inscripciones ya usa el servidor; progreso y cuestionarios siguen pendientes.
