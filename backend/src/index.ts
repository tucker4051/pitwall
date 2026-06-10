import { loadConfig } from "./config/env.js";
import { createAppServer } from "./server.js";
import { attachWebSocketServer } from "./ws/websocket-server.js";

const config = loadConfig();
const server = createAppServer(config);
const webSocketServer = attachWebSocketServer(server);

console.log("Starting PitWall backend.");

server.listen(config.backendPort, () => {
  console.log("PitWall backend started.", {
    port: config.backendPort,
    nodeEnv: config.nodeEnv,
    dataMode: config.dataMode
  });
});

server.on("error", (error) => {
  console.error("PitWall backend server error.", error);
});

function shutdown(signal: NodeJS.Signals): void {
  console.log(`Received ${signal}. Shutting down backend.`);

  webSocketServer.close();

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
