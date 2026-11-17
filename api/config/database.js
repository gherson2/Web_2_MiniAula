import { Sequelize } from "sequelize";
import dotenv from "dotenv";
import { fileURLToPath } from "node:url";

dotenv.config({ path: fileURLToPath(new URL("../.env", import.meta.url)), quiet: true });

const options = {
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT || 5432),
  dialect: "postgres",
  logging: false,
  dialectOptions: { connectionTimeoutMillis: 5000 },
  pool: { max: 5, acquire: 10000 },
};

// Solo las pruebas usan una BD en memoria; producción siempre usa PostgreSQL.
if (process.env.NODE_ENV === "test" && process.env.DB_TEST_MEMORY === "true") {
  const { newDb, DataType } = await import("pg-mem");
  const memory = newDb({ autoCreateForeignKeyIndices: true, noAstCoverageCheck: true });
  memory.public.registerFunction({
    name: "current_database", returns: DataType.text, implementation: () => "miniaula_test",
  });
  memory.public.registerFunction({
    name: "version", returns: DataType.text, implementation: () => "PostgreSQL 16",
  });
  options.dialectModule = memory.adapters.createPg();
}

const sequelize = new Sequelize(
  process.env.DB_NAME || "miniaula_db",
  process.env.DB_USER || "postgres",
  process.env.DB_PASSWORD || "",
  options,
);

export default sequelize;
