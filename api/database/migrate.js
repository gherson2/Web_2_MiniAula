import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { QueryTypes } from "sequelize";
import sequelize from "../config/database.js";
import { up } from "./migrations/001-initial.js";

export async function migrate() {
  await sequelize.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
    name VARCHAR(255) PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`);
  const name = "001-initial";
  const applied = await sequelize.query("SELECT name FROM schema_migrations WHERE name = :name", {
    replacements: { name }, type: QueryTypes.SELECT,
  });
  if (applied.length) return;
  await sequelize.transaction(async (transaction) => {
    await up(sequelize.query.bind(sequelize), transaction);
    await sequelize.query("INSERT INTO schema_migrations (name) VALUES (:name)", {
      replacements: { name }, transaction,
    });
  });
  console.log("Migración aplicada:", name);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    await migrate();
  } catch (error) {
    console.error("No se pudo migrar:", error.message);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
}
