# MiniAula — Ingeniería Web 2

Plataforma de cursos cortos con roles de instructor y estudiante.
**Avance con aula del estudiante, orientativamente ~50 % del proyecto**, no entrega final.
El porcentaje es una planificación, no una nota ni un conteo uniforme de requisitos.
Ver [AVANCE.md](AVANCE.md) para el alcance y lo pendiente.

## Qué puedes hacer

- Registrarte como estudiante o instructor, iniciar/cerrar sesión y editar tu perfil.
- Explorar cursos publicados con búsqueda, categorías y paginación.
- Ver el detalle y el temario público, sin exponer contenido privado.
- Como instructor: crear/editar cursos, publicar/archivar/eliminar los propios.
- Crear/editar/eliminar lecciones de texto y video, y cambiar su orden con flechas.
- Como estudiante: inscribirte en cursos publicados y consultar tus cursos inscritos.
- La API impide inscripciones duplicadas (409), incluso ante solicitudes simultáneas.
- Abrir el aula de un curso inscrito y leer las lecciones de contenido desbloqueadas.
- Ver el temario bloqueado sin su contenido; la API rechaza saltos con 403.

**Todavía no puedes completar lecciones, rendir cuestionarios ni consultar el
porcentaje en Mis cursos o las estadísticas del instructor.** La lista básica de
“Mis cursos” no significa que RF-13 esté terminado. Los cuestionarios del seed preparan los datos de la
siguiente etapa; su existencia no significa que el módulo esté terminado.

### Este incremento (~5 puntos porcentuales)

Se añade el aula del estudiante: acceso por inscripción, lectura de texto/video y
bloqueo secuencial en servidor. La primera lección se abre al inscribirse; para abrir
las siguientes se necesita progreso completado, cuyo flujo de escritura sigue pendiente.
El progreso puede consultarse con `GET /api/cursos/:id/progreso`, pero no se simula
ninguna lección completada. Los cuestionarios todavía no muestran preguntas ni reciben intentos.
La carpeta completa `Downloads/26` no se modificó.

**La nueva versión del aula aún no fue reconstruida en Docker porque el motor
estaba apagado.** Enciende Docker Desktop y ejecuta `docker compose up --build`.
Se mantiene el proyecto Compose `miniaula-avance45` para conservar el mismo volumen.
Cuando esté levantado, **en esta computadora el avance abre en
<http://localhost:8081>**, la API en <http://localhost:4001/api> y Swagger en
<http://localhost:4001/api/docs>. La copia completa de `26` conserva su configuración en el 8080.
Las cuentas de prueba son las indicadas más abajo; para inscribirte usa un estudiante
como `gerson@miniaula.test`.

## Levantar con Docker

Requisito: Docker Desktop instalado **y en ejecución**, usando contenedores Linux.
Abre una terminal en la carpeta que contiene este README y `docker-compose.yml`:

```sh
docker compose up --build
```

Direcciones por defecto, si no se personalizan los puertos del `.env`:

- Aplicación: <http://localhost:8080>
- API: <http://localhost:4000/api>
- Swagger: <http://localhost:4000/api/docs>
- OpenAPI JSON: <http://localhost:4000/api/docs.json>

Compose prepara PostgreSQL, ejecuta la migración y carga los datos de demostración.
No necesitas instalar Node ni PostgreSQL para esta modalidad.
Si algún puerto está ocupado, copia `.env.example` de la raíz a `.env` y cambia
`WEB_PORT`, `API_PORT` o `DB_PORT`. No modifiques ni reemplaces un `.env` existente sin revisarlo.

Los valores por defecto son **solo para demostración local**. Si `JWT_SECRET` está vacío,
la API genera un secreto aleatorio que no imprime ni guarda en el repositorio.
Para mantener las sesiones al recrear el contenedor, configura uno estable de al menos
32 caracteres en el `.env` de la raíz.

Para detener los servicios conservando los datos:

```sh
docker compose down
```

El volumen `miniaula_data` conserva PostgreSQL entre arranques. No elimines el volumen
si necesitas mantener tus cursos y usuarios. Cambiar las credenciales de PostgreSQL en
`.env` no modifica las de un volumen ya inicializado.

### Usuarios de demostración

Contraseña inicial de todas estas cuentas: **`DemoAula2026!`**.
Son credenciales públicas de prueba, no cuentas reales.

| Rol | Nombre | Email |
|---|---|---|
| Instructor | Ana Pérez | `ana@miniaula.test` |
| Instructor | Luis Rojas | `luis@miniaula.test` |
| Estudiante | Gerson Estudiante | `gerson@miniaula.test` |
| Estudiante | María López | `maria@miniaula.test` |
| Estudiante | Pedro Díaz | `pedro@miniaula.test` |

El seed crea 3 cursos publicados de 5 lecciones cada uno, con un cuestionario por
curso. Es repetible: no borra datos ni sobrescribe los cursos o contraseñas existentes.
`SEED_PASSWORD` solo se aplica al crear las cuentas, no cambia las ya creadas.

Ejecutar manualmente:

```sh
docker compose exec api npm run db:migrate
docker compose exec api npm run db:seed
```

## Desarrollo local sin Docker

Requisitos: Node.js **22.12 o superior**, npm y PostgreSQL 16 o superior.

1. Instala las dependencias:

   ```sh
   npm --prefix api ci
   npm --prefix web ci
   ```

2. Crea `api/.env` a partir de `api/.env.example` **solo si no existe**. Configura
   la conexión a una base de datos propia ya creada (`DB_NAME`, `DB_USER`, `DB_PASSWORD`,
   `DB_HOST`, `DB_PORT`). Agrega `JWT_SECRET` con 32 caracteres o más.
   Puedes generar un secreto con:

   ```sh
   node -e "console.log(require('node:crypto').randomBytes(48).toString('hex'))"
   ```

3. Crea `web/.env` a partir de `web/.env.example`:

   ```dotenv
   VITE_API_URL=http://localhost:4000/api
   ```

4. Prepara la base de datos:

   ```sh
   npm --prefix api run db:migrate
   npm --prefix api run db:seed
   ```

5. En una terminal:

   ```sh
   npm --prefix api run dev
   ```

6. En otra terminal:

   ```sh
   npm --prefix web run dev
   ```

Frontend: <http://localhost:5173>. `FRONTEND_ORIGIN` en `api/.env` debe coincidir.
La configuración de Compose usa el `.env` de la raíz; el desarrollo sin Docker usa
`api/.env` y `web/.env`. No se envían contraseñas ni JWT_SECRET al frontend.

## Estructura y decisiones

```text
api/
  app.js                       # Express, seguridad, documentación y rutas
  index.js                     # Arranque, migración y cierre
  config/                      # PostgreSQL y entorno
  routes/ → controllers/ → services/ → models/
  middlewares/                 # JWT, rol, dueño, validación y errores
  validators/                  # Esquemas Zod de body, params y query
  database/migrations/         # SQL versionado
  database/seed.js
  docs/openapi.js
  test/
web/
  src/
    context/ hooks/ services/ components/ pages/
  e2e/                         # Prueba con navegador y API aislada
  nginx.conf
docker-compose.yml
```

- Express con módulos ES, Sequelize y PostgreSQL. Los controladores no consultan la BD.
- Se usa SQL explícito en migraciones; no `sync({ force: true })` en producción.
- Los seis modelos de la consigna ya existen. `actualizadoEn` se agrega como campo
  de auditoría a las entidades; no cambia las relaciones del modelo base.
- bcrypt con costo 12; JWT firmado con HS256 y expiración configurable (2h por defecto).
- El logout elimina usuario/token del cliente. El JWT no tiene revocación inmediata
  en servidor: un token copiado sigue siendo válido hasta su expiración.
- Usuario/token en Context API y localStorage. Axios agrega el token y limpia
  la sesión ante un 401. Los componentes no llaman directamente a fetch/axios.
- Bootstrap para grilla/formularios y CSS propio consistente; diseño desde 375px.
- El catálogo y el detalle público solo incluyen cursos publicados. El detalle
  devuelve una lista explícita de campos del temario, nunca contenido ni respuestas.
- La API verifica rol y propiedad en servidor. No permite cambiar instructor o rol
  mediante los formularios de edición.
- No se publica un curso vacío ni se elimina la última lección de uno publicado.
- Si hay inscritos, el curso no se elimina y no se cambia su estructura: se puede
  archivar o editar sus datos. Es una decisión conservadora para no invalidar progreso.
- Las escrituras estructurales usan transacciones y bloqueo del curso en PostgreSQL.
- La inscripción usa ese mismo bloqueo y la restricción única estudiante/curso.
  Solo se acepta un estudiante autenticado y el ID sale del JWT, nunca del body/query.
- “Mis cursos” conserva las inscripciones de cursos archivados y no muestra un
  enlace público roto. No devuelve contenidos, respuestas correctas ni datos de otros estudiantes.
- `GET /cursos/:id/progreso` devuelve solo el temario y resumen del estudiante
  autenticado, sin contenido. `GET /lecciones/:id` verifica inscripción y bloqueo
  antes de consultar el texto/video; una URL directa no evita el permiso.
- El bloqueo comprueba todas las lecciones previas. Un cuestionario previo exige
  `completada` y `mejorNota >= notaMinima`. Los inscritos conservan acceso al archivar.
- El aula representa texto escapado por React y enlaces HTTP/HTTPS seguros;
  no ejecuta HTML del instructor. Completar y rendir aún no tienen endpoints.

## Pruebas

Después de instalar las dependencias:

```sh
npm --prefix api test
npm --prefix web test
npm --prefix web run build
```

La compilación necesita `VITE_API_URL` en `web/.env` o en el entorno.

Las pruebas de API usan **pg-mem**, aislado de tu PostgreSQL: verifican migración,
seed, autenticación, filtros, permisos, privacidad, contenido e inscripciones.
En memoria se aprueban 29 pruebas y se omite una de concurrencia. El frontend tiene
28 pruebas aprobadas. El recorrido de navegador incluye contenido desbloqueado,
bloqueo 403 por API/URL directa y diseño móvil de 375px.
Ese adaptador no prueba el bloqueo ni las garantías de rollback de PostgreSQL real.
El adaptador puede imprimir una advertencia de fechas de Moment.

Para probar con un navegador real:

```sh
npm --prefix web run test:e2e
```

En Windows utiliza Edge instalado. En otros sistemas instala Chromium con
`npx --prefix web playwright install chromium` y, si hace falta, define
`PLAYWRIGHT_CHANNEL`. El script inicia y cierra servidores de prueba aislados;
el puerto 5175 debe estar libre. Guarda capturas en `web/test-results/` (excluido de Git).
No utiliza ni modifica la base de datos local.

Con los contenedores encendidos puedes comprobar el despliegue real:

En esta computadora (PowerShell), para probar el avance en vez de la copia de `26`:

```powershell
$env:DOCKER_TEST_URL = "http://localhost:8081"
npm --prefix web run test:docker
```

Esta prueba usa Nginx, el frontend compilado, la API y PostgreSQL de Docker.
Crea un curso temporal y lo elimina al terminar; no modifica cursos existentes.
Utiliza las cuentas de demostración. Si cambiaste URL o credenciales, configura
`DOCKER_TEST_URL`, `DOCKER_TEST_EMAIL` y `DOCKER_TEST_PASSWORD` antes de ejecutarla.

### Verificación anterior de Docker (avance del 45 %)

La versión del 45 % se construyó y arrancó con Compose con los tres servicios
saludables. La prueba `npm --prefix web run test:docker` pasó usando el frontend
compilado en Nginx, la API en su contenedor y PostgreSQL real. Se verificaron
autenticación, perfil, cursos/lecciones, orden, publicación, privacidad y archivo.
El curso temporal de prueba se eliminó sin cambiar los cursos existentes.
La migración y el seed también se ejecutaron nuevamente dentro de la API sin duplicar datos.

En esta máquina, `.env` usa `COMPOSE_PROJECT_NAME=miniaula-avance45`,
`WEB_PORT=8081`, `API_PORT=4001` y `DB_PORT=5435`. Cada despliegue tiene su propio
volumen de datos: no se modificó la versión completa que ocupa el 8080,
ni se detuvieron o modificaron las otras bases de datos locales.
Antes de la defensa, repetir el arranque y la demostración en la máquina del docente.

Las 23 pruebas de API se ejecutaron satisfactoriamente contra PostgreSQL 16
en Docker para ese avance, en una base temporal eliminada al terminar. Incluyen 8
inscripciones simultáneas con una sola fila creada. También pasaron 19 pruebas de frontend y el
recorrido en navegador con inscripción, lista privada y persistencia al recargar.
El aula nueva tiene pruebas aisladas aprobadas; falta repetir la comprobación de
Docker/PostgreSQL real. No se atribuyen los resultados anteriores al código nuevo.
Para repetir las pruebas de API sobre una
base **nueva y exclusiva para pruebas**, configura `API_TEST_POSTGRES=true`, la
conexión `DB_*` y un `DB_NAME` terminado en `_test`, y ejecuta `npm --prefix api test`.
No uses una base con datos que quieras conservar.

### Dependencias

La API usa un override de `uuid` a 11.1.1 o superior, compatible con `require`, para
evitar un aviso de seguridad transitivo de Sequelize. No se aplica `npm audit fix --force`.
El frontend tiene un aviso pendiente de `picomatch` en las herramientas de desarrollo
(Vite/Vitest y dependencias); al implementar esta etapa, el registro aún ofrecía
4.0.7 sin versión corregida. No está incluido en el JavaScript de producción.
Revisa `npm audit` periódicamente; no expongas el servidor de desarrollo a Internet.

## Recorrido sugerido para demostrar este avance

1. Abrir el catálogo, buscar un curso y filtrar por categoría.
2. Registrarse como estudiante, editar su perfil, salir y volver a iniciar sesión.
3. Entrar como Ana, crear un curso y comprobar que no se publica sin lecciones.
4. Agregar dos lecciones de texto/video, editarlas y cambiar su orden.
5. Publicar el curso y abrir su detalle público: se ve el temario, no el contenido.
6. Entrar como Luis y comprobar que no puede editar el curso de Ana.
7. Archivar el curso y comprobar que desaparece del catálogo.
8. Entrar como Gerson, elegir un curso publicado e inscribirse desde el detalle.
9. Abrir “Mis cursos”, recargar y comprobar que la inscripción persiste. Volver al
   detalle: no debe ofrecer otra inscripción.
10. Pulsar “Abrir aula”: leer la primera lección y abrir su enlace de video si existe.
11. Ver la siguiente lección bloqueada. Intentar su URL directa: debe mostrar 403.
    En esta etapa no se puede completar la primera para avanzar.

## Trabajo en pareja y entrega final

Ambos integrantes deben trabajar en backend y frontend, en ramas y pull requests
con revisión del compañero. Este avance no crea commits, PRs ni contribuciones ficticias.

Pendiente para la entrega:

- RF-12 a RF-16: guardar completados y progreso secuencial,
  editor de preguntas, intentos y calificación en servidor, porcentaje en mis cursos y panel.
- Completar la documentación con esos endpoints y las pruebas de RN-01 a RN-08.
- Verificar el arranque en Docker desde cero y preparar la defensa individual.
- Video de 5 a 8 minutos con ambos integrantes. **Enlace: pendiente.**
- Tag `v1.0.0` únicamente cuando el proyecto final esté completo y verificado.
