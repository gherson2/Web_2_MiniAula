# MiniAula — Ingeniería Web 2

Proyecto en pareja: plataforma de cursos cortos con roles de instructor y estudiante.
El backend y el frontend se mantienen en un mismo repositorio, en `api/` y `web/`.

## Estado del avance

- Backend inicial con Node.js, Express y JavaScript con módulos ES.
- Scripts de ejecución y desarrollo en `api/package.json`.
- Endpoint de comprobación: `GET /api`.
- Carpeta `web/` reservada para el frontend con React y Vite, todavía pendiente.

Este avance es la base del proyecto; las funcionalidades de la entrega final siguen pendientes.

## Estructura

```text
api/
  index.js            # Servidor Express inicial
  package.json        # Dependencias y scripts
  package-lock.json   # Versiones de dependencias
web/
  README.md           # Estado del frontend
```

## Ejecutar el avance localmente

Requisitos: Node.js 22 o superior y npm.

Desde la raíz del repositorio:

```sh
npm --prefix api ci
npm --prefix api start
```

Para desarrollar con reinicio automático:

```sh
npm --prefix api run dev
```

Abrir <http://localhost:4000/api>. La respuesta esperada es:

```json
{ "mensaje": "Bienvenido a la API de MiniAula" }
```

Actualmente el puerto está definido como `4000` en `api/index.js`. Todavía no se
utilizan variables de entorno ni hay usuarios de prueba o un seed disponible.

## Trabajo con Git y GitHub

Cada integrante desarrolla en su propia rama y abre un pull request hacia `main`.
El compañero revisa el cambio antes de integrarlo. Ambos deben participar en backend
y frontend, como exige la consigna.

Ejemplo para una tarea nueva, desde una copia actualizada de `main`:

```sh
git switch main
git pull --ff-only origin main
git switch -c feat/nombre-de-la-tarea
# Implementar y comprobar el cambio.
git add ruta/del/archivo
git commit -m "feat: describir el avance"
git push -u origin feat/nombre-de-la-tarea
```

Después, abrir el pull request en GitHub y solicitar la revisión del compañero.
Las dependencias (`node_modules/`) y los archivos `.env` se excluyen de Git.

## Pendientes de la consigna

- Autenticación, perfiles, permisos y arquitectura por capas.
- Cursos, lecciones, cuestionarios, inscripciones, avance secuencial y panel del instructor.
- PostgreSQL o MySQL con Sequelize o TypeORM, migraciones y seed requerido.
- Frontend React con Vite, rutas protegidas, servicios, hooks y diseño responsivo.
- Configuración por entorno y archivos `.env.example` sin secretos.
- Documentación de todos los endpoints con Swagger o Postman.
- Dockerfiles de API y frontend y `docker-compose.yml` con base de datos y volumen.
- Instrucciones de ejecución con `docker compose up --build`, seed y usuarios de prueba.
- Video de demostración de 5 a 8 minutos con participación de ambos integrantes;
  agregar aquí el enlace cuando esté disponible.
- Tag `v1.0.0` al completar y verificar la entrega final.

Docker aún no está configurado en este avance.
