import { buildApp } from "./app";
import { config } from "./config";

const app = buildApp();

const start = async (): Promise<void> => {
  try {
    await app.listen({ port: config.server.port, host: config.server.host });
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
};

start();

