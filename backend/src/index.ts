import { loadConfig } from "./config/env.js";
import { createOpenF1Config } from "./openf1/openf1-config.js";
import { createOpenF1Connector, type OpenF1Connector } from "./openf1/openf1-connector.js";
import { createOpenF1TokenManager } from "./openf1/openf1-token-manager.js";
import { createAppServer } from "./server.js";
import { attachWebSocketServer } from "./ws/websocket-server.js";

const config = loadConfig();
const server = createAppServer(config);
const webSocketServer = attachWebSocketServer(server, { dataMode: config.dataMode });
let openF1Connector: OpenF1Connector | null = null;

if (config.dataMode === "live") {
  const openF1Config = createOpenF1Config(config.openF1);
  const tokenManager = createOpenF1TokenManager(openF1Config);
  openF1Connector = createOpenF1Connector(openF1Config, tokenManager, {
    onSourceMessage: webSocketServer.processSourceMessage
  });

  console.log("OpenF1 live mode configuration validated.", {
    mqttHost: openF1Config.mqtt.host,
    mqttPort: openF1Config.mqtt.port,
    topicCount: openF1Config.topics.length
  });
  console.log("OpenF1 connector starting.");

  openF1Connector.connect().catch((error: unknown) => {
    console.error("OpenF1 connector startup failed.", {
      message: getSafeErrorMessage(error)
    });
  });
}

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
  void openF1Connector?.disconnect();

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

function getSafeErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}
