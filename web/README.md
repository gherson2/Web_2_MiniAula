# Frontend de MiniAula

SPA con React, Vite, JavaScript y Bootstrap. Incluye autenticación, perfil,
catálogo, detalle público y editor de cursos/lecciones del instructor.
Incluye inscripción, lista privada y aula del estudiante con lectura de contenido
desbloqueado y temario bloqueado. Completar, rendir y el porcentaje en Mis cursos
siguen pendientes.

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
inscripciones y el aula usan el servidor. El resumen de progreso es de solo lectura;
guardar completados y rendir cuestionarios siguen pendientes.
