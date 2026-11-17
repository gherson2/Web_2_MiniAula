import bcrypt from "bcrypt";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Usuario, Curso, Leccion, Pregunta, sequelize } from "../models/index.js";
import { migrate } from "./migrate.js";

const people = [
  { nombre: "Ana Pérez", email: "ana@miniaula.test", rol: "instructor" },
  { nombre: "Luis Rojas", email: "luis@miniaula.test", rol: "instructor" },
  { nombre: "Gerson Estudiante", email: "gerson@miniaula.test", rol: "estudiante" },
  { nombre: "María López", email: "maria@miniaula.test", rol: "estudiante" },
  { nombre: "Pedro Díaz", email: "pedro@miniaula.test", rol: "estudiante" },
];
const examples = [
  { titulo: "Node.js desde cero", categoria: "Programación", nivel: "basico",
    descripcion: "Da tus primeros pasos con JavaScript en el servidor y aprende a organizar una API.",
    lessons: ["Bienvenida a Node.js", "Tu primer servidor", "Rutas con Express", "Repaso de Node.js", "Siguientes pasos"],
    question: "¿Qué herramienta permite crear un servidor HTTP con JavaScript?",
    options: ["Node.js", "Figma", "CSS"], correct: 0 },
  { titulo: "Diseño de interfaces", categoria: "Diseño", nivel: "basico",
    descripcion: "Aprende los fundamentos de jerarquía visual, color y composición para crear interfaces claras.",
    lessons: ["Qué es una interfaz", "Jerarquía visual", "Color y contraste", "Repaso de diseño", "Tu primer wireframe"],
    question: "¿Qué ayuda a que el texto se lea con claridad?",
    options: ["Usar muchos colores", "Un buen contraste", "Ocultar los títulos"], correct: 1 },
  { titulo: "React: primeros componentes", categoria: "Programación", nivel: "intermedio",
    descripcion: "Construye interfaces con componentes, props y estado, y organiza tu primera SPA.",
    lessons: ["Introducción a React", "Componentes y props", "El estado", "Repaso de React", "Organizar una SPA"],
    question: "¿Qué hook permite manejar estado local en React?",
    options: ["useState", "useColor", "useHTML"], correct: 0 },
];

export async function seed() {
  const passwordHash = await bcrypt.hash(process.env.SEED_PASSWORD || "DemoAula2026!", 12);
  await sequelize.transaction(async (transaction) => {
    const users = [];
    for (const person of people) {
      let user = await Usuario.findOne({ where: { email: person.email }, transaction });
      if (!user) user = await Usuario.create({ ...person, passwordHash }, { transaction });
      users.push(user);
    }
    for (const [index, example] of examples.entries()) {
      const instructorId = users[index === 1 ? 1 : 0].id;
      const exists = await Curso.findOne({ where: { titulo: example.titulo, instructorId }, transaction });
      if (exists) continue; // No sobrescribir contenido que el instructor haya editado.
      const course = await Curso.create({
        titulo: example.titulo, descripcion: example.descripcion, categoria: example.categoria,
        nivel: example.nivel, estado: "publicado", instructorId,
      }, { transaction });
      for (const [lessonIndex, titulo] of example.lessons.entries()) {
        const isQuiz = lessonIndex === 3;
        const lesson = await Leccion.create({
          titulo, tipo: isQuiz ? "cuestionario" : "contenido", orden: lessonIndex + 1,
          cursoId: course.id, contenido: isQuiz ? null :
            `${titulo}\n\nEsta lección presenta los conceptos principales del tema. Lee el material y practica con un ejemplo propio.\n\nEn esta primera etapa puedes explorar el temario. El avance del estudiante se implementará en la siguiente entrega.`,
          videoUrl: null, notaMinima: 70,
        }, { transaction });
        if (isQuiz) await Pregunta.create({
          enunciado: example.question, opciones: example.options,
          indiceCorrecto: example.correct, leccionId: lesson.id,
        }, { transaction });
      }
    }
  });
  console.log("Seed listo: 2 instructores, 3 estudiantes y 3 cursos de 5 lecciones.");
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    await migrate();
    await seed();
  } catch (error) {
    console.error("No se pudo ejecutar el seed:", error.message);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
}
