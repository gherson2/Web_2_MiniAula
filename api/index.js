import { app } from "./app.js";
import sequelize from "./config/database.js";
import { validateEnvironment } from "./config/env.js";
import { migrate } from "./database/migrate.js";
import { seed } from "./database/seed.js";

async function iniciarServidor() {
  try {
    validateEnvironment();
    await sequelize.authenticate();
    await migrate();
    if (process.env.SEED_ON_START === "true") await seed();
    const PORT = Number(process.env.PORT || 4000);
    const server = app.listen(PORT, "0.0.0.0", () => {
      console.log(`Servidor funcionando en http://localhost:${PORT}`);
    });
    const shutdown = () => {
      server.close(async () => {
        await sequelize.close();
        process.exit(0);
      });
    };
    process.on("SIGTERM", shutdown);
    process.on("SIGINT", shutdown);
  } catch (error) {
    console.error("No se pudo iniciar MiniAula:", error.message);
    await sequelize.close();
    process.exitCode = 1;
  }
}

iniciarServidor();
