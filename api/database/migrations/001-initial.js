// Migración versionada: nunca se usa sync({ force: true }) al iniciar.
export async function up(query, transaction) {
  const timestamps = '"creadoEn" TIMESTAMPTZ NOT NULL, "actualizadoEn" TIMESTAMPTZ NOT NULL';
  const statements = [
    `CREATE TABLE usuarios (
      id SERIAL PRIMARY KEY, nombre VARCHAR(100) NOT NULL,
      email VARCHAR(255) NOT NULL UNIQUE, "passwordHash" VARCHAR(255) NOT NULL,
      rol VARCHAR(20) NOT NULL CHECK (rol IN ('instructor', 'estudiante')), ${timestamps}
    )`,
    `CREATE TABLE cursos (
      id SERIAL PRIMARY KEY, titulo VARCHAR(150) NOT NULL, descripcion TEXT NOT NULL,
      categoria VARCHAR(80) NOT NULL, nivel VARCHAR(30) NOT NULL,
      estado VARCHAR(20) NOT NULL DEFAULT 'borrador' CHECK (estado IN ('borrador','publicado','archivado')),
      "instructorId" INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT, ${timestamps}
    )`,
    `CREATE TABLE lecciones (
      id SERIAL PRIMARY KEY, titulo VARCHAR(150) NOT NULL,
      tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('contenido','cuestionario')),
      contenido TEXT, "videoUrl" VARCHAR(2048), orden INTEGER NOT NULL CHECK (orden > 0),
      "notaMinima" INTEGER NOT NULL DEFAULT 70 CHECK ("notaMinima" BETWEEN 0 AND 100),
      "cursoId" INTEGER NOT NULL REFERENCES cursos(id) ON DELETE CASCADE, ${timestamps}
    )`,
    `CREATE TABLE preguntas (
      id SERIAL PRIMARY KEY, enunciado TEXT NOT NULL, opciones JSONB NOT NULL,
      "indiceCorrecto" INTEGER NOT NULL CHECK ("indiceCorrecto" >= 0),
      "leccionId" INTEGER NOT NULL REFERENCES lecciones(id) ON DELETE CASCADE, ${timestamps}
    )`,
    `CREATE TABLE inscripciones (
      id SERIAL PRIMARY KEY, "estudianteId" INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
      "cursoId" INTEGER NOT NULL REFERENCES cursos(id) ON DELETE RESTRICT,
      completado BOOLEAN NOT NULL DEFAULT false, "fechaInscripcion" TIMESTAMPTZ NOT NULL,
      "actualizadoEn" TIMESTAMPTZ NOT NULL, UNIQUE ("estudianteId","cursoId")
    )`,
    `CREATE TABLE progresos (
      id SERIAL PRIMARY KEY, "inscripcionId" INTEGER NOT NULL REFERENCES inscripciones(id) ON DELETE CASCADE,
      "leccionId" INTEGER NOT NULL REFERENCES lecciones(id) ON DELETE RESTRICT,
      completada BOOLEAN NOT NULL DEFAULT false,
      intentos INTEGER NOT NULL DEFAULT 0 CHECK (intentos BETWEEN 0 AND 3),
      "mejorNota" INTEGER NOT NULL DEFAULT 0 CHECK ("mejorNota" BETWEEN 0 AND 100),
      ${timestamps}, UNIQUE ("inscripcionId","leccionId")
    )`,
    'CREATE INDEX cursos_catalogo_idx ON cursos (estado, categoria)',
    'CREATE INDEX cursos_instructor_idx ON cursos ("instructorId")',
    'CREATE INDEX lecciones_curso_idx ON lecciones ("cursoId", orden)',
  ];
  for (const sql of statements) await query(sql, { transaction });
}
