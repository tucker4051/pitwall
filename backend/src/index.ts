import { loadConfig } from "./config/env.js";
import { createAppServer } from "./server.js";

const config = loadConfig();
const server = createAppServer(config);

server.listen(config.backendPort, () => {
  console.log(`PitWall backend listening on port ${config.backendPort}`);
});

function shutdown(signal: NodeJS.Signals): void {
  console.log(`Received ${signal}. Shutting down backend.`);

  server.close((error) => {
    if (error) {
      console.error("Backend shutdown failed.", error);
      process.exit(1);
    }

    process.exit(0);
  });
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
