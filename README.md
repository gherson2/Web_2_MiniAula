
MiniAula — Ingeniería Web 2
Plataforma de cursos cortos con roles de instructor y estudiante.

Funcionalidades RF-01 a RF-16 implementadas y verificadas en Docker/PostgreSQL.
La entrega final requiere completar las evidencias de los integrantes y preparar la defensa.

Ver AVANCE.md para el alcance y lo pendiente.

## Video del proyecto

[Ver la demostración en Google Drive](https://drive.google.com/file/d/1hR_crRMn72fbrRNZnjkxLKROr--dyr8G/view?usp=sharing).

Duración aproximada: 6 minutos y 36 segundos. Gerson narra la demostración y
utiliza cuentas distintas de instructor y estudiante.

El enlace abre directamente el video completo, incluida la explicación del backend,
el frontend y Docker en Visual Studio Code. El docente debe tener permiso para reproducirlo.

Qué puedes hacer
Registrarte como estudiante o instructor, iniciar/cerrar sesión y editar tu perfil.

Explorar cursos publicados con búsqueda, categorías y paginación.

Ver el detalle y el temario público, sin exponer contenido privado.

Como instructor: crear/editar cursos, publicar/archivar/eliminar los propios.

Crear/editar/eliminar lecciones de texto y video, y cambiar su orden con flechas.

Crear cuestionarios, definir su nota mínima y gestionar preguntas de opción múltiple propias.

Como estudiante: inscribirte en cursos publicados y consultar tus cursos inscritos.

La API impide inscripciones duplicadas (409), incluso ante solicitudes simultáneas.

Abrir el aula de un curso inscrito y leer las lecciones de contenido desbloqueadas.

Ver el temario bloqueado sin su contenido; la API rechaza saltos con 403.

Marcar lecciones de contenido como completadas, guardar el progreso y desbloquear la siguiente.

Consultar el avance en el aula y conservarlo al recargar, sin duplicar completados.

Consultar el avance real de cada curso en Mis cursos, con barra y acciones para empezar, continuar o repasar.

Rendir cuestionarios con calificación en servidor, hasta tres intentos y mejor nota persistida.

Consultar estadísticas de cursos propios: inscritos, completados, progreso y nota promedio,
y la primera lección pendiente de los estudiantes.

Funcionalidades incorporadas: progreso, evaluaciones y estadísticas
Se añade el aula del estudiante: acceso por inscripción, lectura de texto/video y

bloqueo secuencial en servidor. La primera lección se abre al inscribirse; para abrir

las siguientes se necesita completar el contenido anterior o aprobar el cuestionario anterior.

El progreso se consulta con GET /api/cursos/:id/progreso y se guarda al completar
contenido con POST /api/lecciones/:id/completar. La API calcula el resumen:

no acepta que el cliente indique el porcentaje, la inscripción o la nota.
El estudiante recibe preguntas sin claves solo si está inscrito y la lección está
desbloqueada. El endpoint de completar contenido no aprueba cuestionarios.

Editor del instructor: al crear una lección elige Contenido o Cuestionario.
Para un cuestionario indica una nota mínima entera entre 0 y 100. Después de guardarlo,
usa el botón Preguntas del temario para agregar, editar o eliminar preguntas.
Cada pregunta tiene entre 2 y 6 opciones diferentes y una respuesta correcta.
El cuestionario admite hasta 100 preguntas y su listado está paginado.
La API nunca devuelve la clave guardada, ni al instructor: al editar debe seleccionarla
nuevamente. Los cursos con inscritos conservan preguntas y nota mínima sin cambios.
El tipo de una lección guardada no se cambia; crea otra si necesitas un tipo diferente.

Rendir en el aula: selecciona una opción por pregunta y pulsa Enviar respuestas.
POST /api/lecciones/:id/intentos recibe respuestas con preguntaId e indiceElegido
(índice desde cero). No acepta notas del cliente. Las respuestas deben cubrir
exactamente todas las preguntas, sin repetidas, ajenas ni opciones inexistentes.
Los errores de validación no consumen intentos.

Cada envío válido consume uno de los tres intentos, incluso después de aprobar.
La nota mostrada es el porcentaje de aciertos redondeado a un entero; la aprobación
compara la proporción exacta con la nota mínima (2/3 no aprueba un mínimo de 67).
Una nota menor posterior no elimina la mejor nota ni una aprobación anterior.
Al aprobar se desbloquea la siguiente lección; al completar todas termina el curso.
Recargar no restablece los intentos. No se devuelven claves ni correcciones por pregunta.
Ante un error de conexión, recarga para consultar el estado antes de reenviar:
una solicitud puede haberse guardado aunque no haya llegado su respuesta.

Panel del instructor: usa Ver estadísticas desde la tarjeta o el editor del curso.
GET /api/instructor/cursos/:id/resumen exige sesión de su instructor propietario.
El progreso promedio incluye todos los inscritos; sin inscritos es 0.
La nota promedio usa la mejor nota de cada cuestionario intentado por estudiante,
no inventa ceros para los no intentados y es null cuando no hay notas.
El punto de detención es la primera lección pendiente de cada estudiante, no una
afirmación de abandono. Quienes completaron el curso no suman detenciones.
El panel muestra agregados, no identidades ni calificaciones individuales.

Mis cursos usa el mismo cálculo del aula. Su respuesta incluye completadas, total,
porcentaje y completado de cada inscripción del usuario autenticado. Los cursos
archivados conservan su progreso. La lista carga lecciones y progresos en lote,
sin una consulta adicional por cada tarjeta ni datos privados de otros estudiantes.

La carpeta completa Downloads/26 no se modificó.

**Versión actual reconstruida y verificada en Docker el 25 de noviembre de 2026.**

Los tres servicios están saludables. Pasaron 63 pruebas con PostgreSQL real y el
recorrido completo de evaluaciones y panel con React compilado servido por Nginx.

Se mantiene el proyecto Compose miniaula-avance45 para conservar el mismo volumen.

Cuando esté levantado, **en esta computadora el avance abre en

http://localhost:8081**, la API en http://localhost:4001/api y Swagger en

http://localhost:4001/api/docs. La copia completa de 26 conserva su configuración en el 8080.

Las cuentas de prueba son las indicadas más abajo; para inscribirte usa un estudiante

como gerson@miniaula.test.

Levantar con Docker
Requisito: Docker Desktop instalado y en ejecución, usando contenedores Linux.

Abre una terminal en la carpeta que contiene este README y docker-compose.yml:


docker compose up --build
Direcciones por defecto, si no se personalizan los puertos del .env:

Aplicación: http://localhost:8080

API: http://localhost:4000/api

Swagger: http://localhost:4000/api/docs

OpenAPI JSON: http://localhost:4000/api/docs.json

Compose prepara PostgreSQL, ejecuta la migración y carga los datos de demostración.

No necesitas instalar Node ni PostgreSQL para esta modalidad.

Si algún puerto está ocupado, copia .env.example de la raíz a .env y cambia

WEB_PORT, API_PORT o DB_PORT. No modifiques ni reemplaces un .env existente sin revisarlo.

Los valores por defecto son solo para demostración local. Si JWT_SECRET está vacío,

la API genera un secreto aleatorio que no imprime ni guarda en el repositorio.

Para mantener las sesiones al recrear el contenedor, configura uno estable de al menos

32 caracteres en el .env de la raíz.

Para detener los servicios conservando los datos:


docker compose down
El volumen miniaula_data conserva PostgreSQL entre arranques. No elimines el volumen

si necesitas mantener tus cursos y usuarios. Cambiar las credenciales de PostgreSQL en

.env no modifica las de un volumen ya inicializado.

Usuarios de demostración
Contraseña inicial de todas estas cuentas: **DemoAula2026!**.

Son credenciales públicas de prueba, no cuentas reales.

| Rol | Nombre | Email |

|---|---|---|

| Instructor | Ana Pérez | ana@miniaula.test |

| Instructor | Luis Rojas | luis@miniaula.test |

| Estudiante | Gerson Estudiante | gerson@miniaula.test |

| Estudiante | María López | maria@miniaula.test |

| Estudiante | Pedro Díaz | pedro@miniaula.test |

El seed crea 3 cursos publicados de 5 lecciones cada uno, con un cuestionario por

curso. Es repetible: no borra datos ni sobrescribe los cursos o contraseñas existentes.

SEED_PASSWORD solo se aplica al crear las cuentas, no cambia las ya creadas.

Ejecutar manualmente:


docker compose exec api npm run db:migrate

docker compose exec api npm run db:seed
Desarrollo local sin Docker
Requisitos: Node.js 22.12 o superior, npm y PostgreSQL 16 o superior.

Instala las dependencias:
   ```sh

   npm --prefix api ci

   npm --prefix web ci

   ```

Crea api/.env a partir de api/.env.example solo si no existe. Configura
   la conexión a una base de datos propia ya creada (DB_NAME, DB_USER, DB_PASSWORD,

   DB_HOST, DB_PORT). Agrega JWT_SECRET con 32 caracteres o más.

   Puedes generar un secreto con:

   ```sh

   node -e "console.log(require('node:crypto').randomBytes(48).toString('hex'))"

   ```

Crea web/.env a partir de web/.env.example:
   ```dotenv

   VITE_API_URL=http://localhost:4000/api

   ```

Prepara la base de datos:
   ```sh

   npm --prefix api run db:migrate

   npm --prefix api run db:seed

   ```

En una terminal:
   ```sh

   npm --prefix api run dev

   ```

En otra terminal:
   ```sh

   npm --prefix web run dev

   ```

Frontend: http://localhost:5173. FRONTEND_ORIGIN en api/.env debe coincidir.

La configuración de Compose usa el .env de la raíz; el desarrollo sin Docker usa

api/.env y web/.env. No se envían contraseñas ni JWT_SECRET al frontend.

Estructura y decisiones

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
Express con módulos ES, Sequelize y PostgreSQL. Los controladores no consultan la BD.

Se usa SQL explícito en migraciones; no sync({ force: true }) en producción.

Los seis modelos de la consigna ya existen. actualizadoEn se agrega como campo

  de auditoría a las entidades; no cambia las relaciones del modelo base.

bcrypt con costo 12; JWT firmado con HS256 y expiración configurable (2h por defecto).

El logout elimina usuario/token del cliente. El JWT no tiene revocación inmediata

  en servidor: un token copiado sigue siendo válido hasta su expiración.

Usuario/token en Context API y localStorage. Axios agrega el token y limpia
  la sesión ante un 401. Los componentes no llaman directamente a fetch/axios.

Bootstrap para grilla/formularios y CSS propio consistente; diseño desde 375px.

El catálogo y el detalle público solo incluyen cursos publicados. El detalle

  devuelve una lista explícita de campos del temario, nunca contenido ni respuestas.

La API verifica rol y propiedad en servidor. No permite cambiar instructor o rol
  mediante los formularios de edición.

No se publica un curso vacío ni se elimina la última lección de uno publicado.
Publicar y admitir inscripciones exige al menos una pregunta por cuestionario,
para no congelar un curso que ningún estudiante pueda terminar.

Si hay inscritos, el curso no se elimina y no se cambia su estructura: se puede

  archivar o editar sus datos. Es una decisión conservadora para no invalidar progreso.

Las escrituras estructurales usan transacciones y bloqueo del curso en PostgreSQL.

La inscripción usa ese mismo bloqueo y la restricción única estudiante/curso.

  Solo se acepta un estudiante autenticado y el ID sale del JWT, nunca del body/query.

“Mis cursos” conserva las inscripciones de cursos archivados y no muestra un
  enlace público roto. No devuelve contenidos, respuestas correctas ni datos de otros estudiantes.

GET /cursos/:id/progreso devuelve solo el temario y resumen del estudiante
  autenticado, sin contenido. GET /lecciones/:id verifica inscripción y bloqueo

  antes de consultar el texto/video; una URL directa no evita el permiso.

El bloqueo comprueba todas las lecciones previas. Un cuestionario previo exige
  completada y mejorNota >= notaMinima. Los inscritos conservan acceso al archivar.

El aula representa texto escapado por React y enlaces HTTP/HTTPS seguros;
  no ejecuta HTML del instructor. Completar contenido y rendir cuestionarios guardan progreso real.

Completar usa una transacción y bloquea la inscripción en PostgreSQL. Repetir la
  petición devuelve el mismo progreso sin crear otra fila. El curso se marca como
  completado únicamente cuando todas sus lecciones están completadas.

Rendir usa el mismo bloqueo de inscripción que completar: cuenta intentos,
califica y actualiza progreso y curso en una sola transacción. La consulta de
claves es interna y se proyectan explícitamente los campos de todas las respuestas HTTP.
El panel usa una instantánea REPEATABLE READ para no mezclar distintos estados
durante el cálculo. Las pruebas en memoria no verifican bloqueos ni aislamiento.

Pruebas
Después de instalar las dependencias:


npm --prefix api test

npm --prefix web test

npm --prefix web run build
La compilación necesita VITE_API_URL en web/.env o en el entorno.

Las pruebas de API usan pg-mem, aislado de tu PostgreSQL: verifican migración,

seed, autenticación, filtros, permisos, privacidad, contenido e inscripciones.

En memoria se aprueban 60 pruebas y se omiten tres de concurrencia. El frontend tiene

61 pruebas aprobadas. El recorrido de navegador incluye contenido desbloqueado,

bloqueo 403, guardar completados, desbloquear, recargar, no duplicar y terminar un curso de contenido, a 375px.

También se verifica el progreso de Mis cursos al empezar, continuar y repasar,
su coherencia con el aula, privacidad, cursos archivados y consultas por página.

El recorrido de cuestionarios verifica creación, nota mínima, CRUD de preguntas,
persistencia al recargar y claves ausentes en respuestas HTTP, también a 375px.
Además verifica reprobar, aprobar, conservar mejor nota tras un fallo posterior,
agotar tres intentos, terminar un curso con cuestionario y consultar el panel.
Las pruebas API incluyen entradas manipuladas, permisos, escala y umbral exacto,
persistencia, desbloqueo y estadísticas sin datos o con varios estudiantes.

Con PostgreSQL 16 real se aprobaron las 63 pruebas, sin omisiones, incluida la
concurrencia de inscripciones, completados e intentos. Se usó una base temporal
separada, eliminada al terminar, no la base habitual.

Ese adaptador no prueba el bloqueo ni las garantías de rollback de PostgreSQL real.

El adaptador puede imprimir una advertencia de fechas de Moment.

Para probar con un navegador real:


npm --prefix web run test:e2e
En Windows utiliza Edge instalado. En otros sistemas instala Chromium con

npx --prefix web playwright install chromium y, si hace falta, define

PLAYWRIGHT_CHANNEL. El script inicia y cierra servidores de prueba aislados;

el puerto 5175 debe estar libre. Guarda capturas en web/test-results/ (excluido de Git).

No utiliza ni modifica la base de datos local.

Con los contenedores encendidos puedes comprobar el despliegue real:

En esta computadora (PowerShell), para probar el avance en vez de la copia de 26:


$env:DOCKER_TEST_URL = "http://localhost:8081"

npm --prefix web run test:docker
Esta prueba usa Nginx, el frontend compilado, la API y PostgreSQL de Docker.

Crea un curso temporal y lo elimina al terminar; no modifica cursos existentes.

Utiliza las cuentas de demostración. Si cambiaste URL o credenciales, configura

DOCKER_TEST_URL, DOCKER_TEST_EMAIL y DOCKER_TEST_PASSWORD antes de ejecutarla.

Recorrido completo de Docker desde cero, en un despliegue desechable (PowerShell):

```powershell
$proyecto = "miniaula-verificacion-" + [guid]::NewGuid().ToString("N").Substring(0, 8)
try {
    docker compose -p $proyecto -f docker-compose.verify.yml up --build -d --wait
    if ($LASTEXITCODE -ne 0) { throw "No se pudo iniciar el despliegue temporal." }
    $direccion = docker compose -p $proyecto -f docker-compose.verify.yml port web 80
    $env:E2E_EXTERNAL_URL = "http://" + $direccion.Trim()
    $env:E2E_ALLOW_WRITE = "true"
    npm --prefix web run test:e2e
    if ($LASTEXITCODE -ne 0) { throw "Falló el recorrido de navegador." }
} finally {
    docker compose -p $proyecto -f docker-compose.verify.yml down
    Remove-Item Env:E2E_EXTERNAL_URL, Env:E2E_ALLOW_WRITE -ErrorAction SilentlyContinue
}
```

Esta modalidad usa PostgreSQL real con datos temporales en tmpfs, sin montar
el volumen habitual; publica el frontend solo en un puerto libre de localhost.
Requiere las dependencias del frontend y Edge/Chromium. El recorrido crea usuarios,
cursos e inscripciones: no apuntes E2E_EXTERNAL_URL a una instalación con datos
que quieras conservar. Se exige E2E_ALLOW_WRITE=true para habilitar ese modo.
Se verificaron inscripción, bloqueo, progreso, cuestionarios reprobados/aprobados,
tres intentos, mejor nota persistida y estadísticas, sin desbordamiento a 375px.

Verificación anterior de Docker
La versión anterior se construyó y arrancó con Compose con los tres servicios

saludables. La prueba npm --prefix web run test:docker pasó usando el frontend

compilado en Nginx, la API en su contenedor y PostgreSQL real. Se verificaron

autenticación, perfil, cursos/lecciones, orden, publicación, privacidad y archivo.

El curso temporal de prueba se eliminó sin cambiar los cursos existentes.

La migración y el seed también se ejecutaron nuevamente dentro de la API sin duplicar datos.

En esta máquina, .env usa COMPOSE_PROJECT_NAME=miniaula-avance45,

WEB_PORT=8081, API_PORT=4001 y DB_PORT=5435. Cada despliegue tiene su propio

volumen de datos: no se modificó la versión completa que ocupa el 8080,

ni se detuvieron o modificaron las otras bases de datos locales.

Antes de la defensa, repetir el arranque y la demostración en la máquina del docente.

Las 23 pruebas de API se ejecutaron satisfactoriamente contra PostgreSQL 16

en Docker para ese avance, en una base temporal eliminada al terminar. Incluyen 8

inscripciones simultáneas con una sola fila creada. También pasaron 19 pruebas de frontend y el

recorrido en navegador con inscripción, lista privada y persistencia al recargar.

La versión actual también pasó la reconstrucción del despliegue habitual, test:docker,
las 63 pruebas API sobre PostgreSQL real y el recorrido completo en Docker temporal.
La evidencia anterior se conserva como historial; ver AVANCE.md para los resultados actuales.

Para repetir las pruebas de API sobre una

base nueva y exclusiva para pruebas, configura API_TEST_POSTGRES=true, la

conexión DB_* y un DB_NAME terminado en _test, y ejecuta npm --prefix api test.

No uses una base con datos que quieras conservar.

Dependencias
La API usa un override de uuid a 11.1.1 o superior, compatible con require, para

evitar un aviso de seguridad transitivo de Sequelize. No se aplica npm audit fix --force.

El frontend tiene un aviso pendiente de picomatch en las herramientas de desarrollo

(Vite/Vitest y dependencias); al implementar esta etapa, el registro aún ofrecía

4.0.7 sin versión corregida. No está incluido en el JavaScript de producción.

Revisa npm audit periódicamente; no expongas el servidor de desarrollo a Internet.

Recorrido sugerido para demostrar este avance
Abrir el catálogo, buscar un curso y filtrar por categoría.

Registrarse como estudiante, editar su perfil, salir y volver a iniciar sesión.

Entrar como Ana, crear un curso y comprobar que no se publica sin lecciones.

Agregar dos lecciones de texto/video, editarlas y cambiar su orden.

Publicar el curso y abrir su detalle público: se ve el temario, no el contenido.

Entrar como Luis y comprobar que no puede editar el curso de Ana.

Archivar el curso y comprobar que desaparece del catálogo.

Entrar como Gerson, elegir un curso publicado e inscribirse desde el detalle.

Abrir “Mis cursos”, recargar y comprobar que la inscripción persiste. Volver al

   detalle: no debe ofrecer otra inscripción.

Pulsar “Abrir aula”: leer la primera lección y abrir su enlace de video si existe.

Ver la siguiente lección bloqueada. Intentar su URL directa: debe mostrar 403.

Marcar la primera lección como completada: la siguiente debe habilitarse.

Recargar y verificar que se conserva el progreso. Repetir no debe sumar otra vez.

Completar todas las lecciones de un curso de contenido y comprobar el estado final.
    Un cuestionario pendiente no se puede saltar con el botón de completar.

Crear un curso con contenido, cuestionario y contenido final. Agregar preguntas,
definir la nota mínima y publicar. Como estudiante, completar el contenido previo,
reprobar y comprobar que el final sigue bloqueado. Aprobar y comprobar el desbloqueo.
Recargar para ver mejor nota e intentos persistidos. Un tercer intento menor no
borra la aprobación; un cuarto envío debe rechazarse con 409.

Como instructor propietario, abrir Ver estadísticas y contrastar inscritos,
progreso, mejor nota promedio y primera lección pendiente. Otro instructor no entra.

Trabajo en pareja y entrega final
Ambos integrantes deben trabajar en backend y frontend, en ramas y pull requests

con revisión del compañero. Este avance no crea commits, PRs ni contribuciones ficticias.

Pendiente para la entrega:

RF-01 a RF-16 y RN-01 a RN-08 implementados; ver AVANCE.md y Swagger para evidencia.

Preparar la defensa individual y repetir la demostración en la máquina del docente.

Confirmar el acceso del docente al video enlazado arriba y acordar la entrega
individual, ya que la consigna establece trabajo en pareja.

Tag v1.0.0 únicamente cuando el proyecto final esté completo y verificado.
