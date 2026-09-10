import app from "./app";
import { logger } from "./lib/logger";
import { pool } from "@workspace/db";
import { recoverExecutions } from "./lib/autonomous-executor";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const server = app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
  void recoverExecutions().catch((error) =>
    logger.error({ error }, "Execution recovery failed"),
  );
});
const recoveryTimer = setInterval(() => {
  void recoverExecutions().catch((error) =>
    logger.error({ error }, "Periodic execution recovery failed"),
  );
}, 60_000);
recoveryTimer.unref();

let shuttingDown = false;
async function shutdown(signal: string) {
  if (shuttingDown) return;
  shuttingDown = true;
  clearInterval(recoveryTimer);
  logger.info({ signal }, "Graceful shutdown started");
  server.close(async (error) => {
    if (error) {
      logger.error({ error }, "HTTP server shutdown failed");
      process.exitCode = 1;
    }
    await pool.end();
    logger.info("Graceful shutdown completed");
    process.exit();
  });
  setTimeout(() => {
    logger.error("Graceful shutdown timed out");
    process.exit(1);
  }, 10_000).unref();
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("unhandledRejection", (error) => {
  logger.fatal({ error }, "Unhandled promise rejection");
  void shutdown("unhandledRejection");
});
process.on("uncaughtException", (error) => {
  logger.fatal({ error }, "Uncaught exception");
  void shutdown("uncaughtException");
});
