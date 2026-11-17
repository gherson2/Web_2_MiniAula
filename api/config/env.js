import "./database.js";

export function validateEnvironment() {
  if (!process.env.DB_PASSWORD) {
    throw new Error("Configura DB_PASSWORD en api/.env con la contraseña de PostgreSQL.");
  }
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    throw new Error("Configura JWT_SECRET con al menos 32 caracteres en api/.env.");
  }
}

export const frontendOrigin = process.env.FRONTEND_ORIGIN || "http://localhost:5173";
