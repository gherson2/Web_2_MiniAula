
import express from "express";

const app = express();
const PORT = 4000;

// Permite recibir datos en formato JSON
app.use(express.json());

// Ruta para verificar que la API funciona
app.get("/api", (req, res) => {
  res.json({ mensaje: "Bienvenido a la API de MiniAula" });
});

// Iniciar el servidor
app.listen(PORT, () => {
  console.log(`Servidor MiniAula funcionando en http://localhost:${PORT}`);
});
