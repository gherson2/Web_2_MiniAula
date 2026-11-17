import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

const common = { timestamps: true, updatedAt: "actualizadoEn", createdAt: "creadoEn" };
const id = { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true };
const requiredString = (length = 255) => ({ type: DataTypes.STRING(length), allowNull: false });

export const Usuario = sequelize.define("Usuario", {
  id,
  nombre: requiredString(100),
  email: { ...requiredString(), unique: true },
  passwordHash: requiredString(),
  rol: { ...requiredString(20), validate: { isIn: [["estudiante", "instructor"]] } },
}, { ...common, tableName: "usuarios",
  defaultScope: { attributes: { exclude: ["passwordHash"] } },
  scopes: { withPassword: {} },
});

export const Curso = sequelize.define("Curso", {
  id, titulo: requiredString(150), descripcion: { type: DataTypes.TEXT, allowNull: false },
  categoria: requiredString(80), nivel: requiredString(30),
  estado: { ...requiredString(20), defaultValue: "borrador",
    validate: { isIn: [["borrador", "publicado", "archivado"]] } },
  instructorId: { type: DataTypes.INTEGER, allowNull: false },
}, { ...common, tableName: "cursos" });

export const Leccion = sequelize.define("Leccion", {
  id, titulo: requiredString(150),
  tipo: { ...requiredString(20), validate: { isIn: [["contenido", "cuestionario"]] } },
  contenido: { type: DataTypes.TEXT, allowNull: true },
  videoUrl: { type: DataTypes.STRING(2048), allowNull: true },
  orden: { type: DataTypes.INTEGER, allowNull: false },
  notaMinima: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 70 },
  cursoId: { type: DataTypes.INTEGER, allowNull: false },
}, { ...common, tableName: "lecciones" });

export const Pregunta = sequelize.define("Pregunta", {
  id, enunciado: { type: DataTypes.TEXT, allowNull: false },
  opciones: { type: DataTypes.JSONB, allowNull: false },
  indiceCorrecto: { type: DataTypes.INTEGER, allowNull: false },
  leccionId: { type: DataTypes.INTEGER, allowNull: false },
}, { ...common, tableName: "preguntas",
  defaultScope: { attributes: { exclude: ["indiceCorrecto"] } },
});

export const Inscripcion = sequelize.define("Inscripcion", {
  id, estudianteId: { type: DataTypes.INTEGER, allowNull: false },
  cursoId: { type: DataTypes.INTEGER, allowNull: false },
  completado: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
}, { ...common, createdAt: "fechaInscripcion", tableName: "inscripciones",
  indexes: [{ unique: true, fields: ["estudianteId", "cursoId"] }],
});

export const Progreso = sequelize.define("Progreso", {
  id, inscripcionId: { type: DataTypes.INTEGER, allowNull: false },
  leccionId: { type: DataTypes.INTEGER, allowNull: false },
  completada: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  intentos: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  mejorNota: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
}, { ...common, tableName: "progresos",
  indexes: [{ unique: true, fields: ["inscripcionId", "leccionId"] }],
});

Usuario.hasMany(Curso, { foreignKey: "instructorId", as: "cursos" });
Curso.belongsTo(Usuario, { foreignKey: "instructorId", as: "instructor" });
Curso.hasMany(Leccion, { foreignKey: "cursoId", as: "lecciones", onDelete: "CASCADE" });
Leccion.belongsTo(Curso, { foreignKey: "cursoId", as: "curso" });
Leccion.hasMany(Pregunta, { foreignKey: "leccionId", as: "preguntas", onDelete: "CASCADE" });
Pregunta.belongsTo(Leccion, { foreignKey: "leccionId" });
Usuario.hasMany(Inscripcion, { foreignKey: "estudianteId", as: "inscripciones" });
Inscripcion.belongsTo(Usuario, { foreignKey: "estudianteId", as: "estudiante" });
Curso.hasMany(Inscripcion, { foreignKey: "cursoId", as: "inscripciones", onDelete: "RESTRICT" });
Inscripcion.belongsTo(Curso, { foreignKey: "cursoId", as: "curso" });
Inscripcion.hasMany(Progreso, { foreignKey: "inscripcionId", as: "progresos", onDelete: "CASCADE" });
Progreso.belongsTo(Inscripcion, { foreignKey: "inscripcionId" });
Leccion.hasMany(Progreso, { foreignKey: "leccionId", onDelete: "RESTRICT" });
Progreso.belongsTo(Leccion, { foreignKey: "leccionId" });

export { sequelize };
