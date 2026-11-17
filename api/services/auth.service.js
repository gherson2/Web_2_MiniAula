import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { Usuario } from "../models/index.js";
import { AppError } from "../utils/AppError.js";

export function publicUser(user) {
  return { id: user.id, nombre: user.nombre, email: user.email, rol: user.rol };
}

function session(user) {
  const token = jwt.sign({}, process.env.JWT_SECRET, {
    subject: String(user.id), algorithm: "HS256",
    expiresIn: process.env.JWT_EXPIRES_IN || "2h",
  });
  return { usuario: publicUser(user), token };
}

export async function register({ nombre, email, password, rol }) {
  const exists = await Usuario.findOne({ where: { email } });
  if (exists) throw new AppError(409, "EMAIL_IN_USE", "Ese email ya está registrado.");
  const passwordHash = await bcrypt.hash(password, 12);
  const user = await Usuario.create({ nombre, email, passwordHash, rol });
  return session(user);
}

export async function login({ email, password }) {
  const user = await Usuario.scope("withPassword").findOne({ where: { email } });
  // La comparación también se realiza con un hash válido si el email no existe.
  const hash = user?.passwordHash || "$2b$12$R9h/cIPz0gi.URNNX3kh2OPST9/PgBkqquzi.Ss7KIUgO2t0jWMUW";
  const valid = await bcrypt.compare(password, hash);
  if (!user || !valid) {
    throw new AppError(401, "INVALID_CREDENTIALS", "Email o contraseña incorrectos.");
  }
  return session(user);
}

export async function updateProfile(user, data) {
  await user.update(data);
  return publicUser(user);
}
