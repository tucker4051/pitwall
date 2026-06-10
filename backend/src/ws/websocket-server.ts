import type { Server } from "node:http";

import { WebSocketServer } from "ws";

type ProofOfConceptMessage = {
  readonly type: "connection:test";
  readonly sentAt: string;
  readonly payload: {
    readonly message: string;
  };
};

export function attachWebSocketServer(server: Server): WebSocketServer {
  const webSocketServer = new WebSocketServer({ noServer: true });

  server.on("upgrade", (request, socket, head) => {
    const pathname = getRequestPathname(request.url);

    if (pathname !== "/ws") {
      socket.destroy();
      return;
    }

    webSocketServer.handleUpgrade(request, socket, head, (webSocket) => {
      webSocketServer.emit("connection", webSocket, request);
    });
  });

  webSocketServer.on("connection", (webSocket) => {
    console.log("WebSocket client connected.");

    webSocket.send(JSON.stringify(createProofOfConceptMessage()));

    webSocket.on("close", () => {
      console.log("WebSocket client disconnected.");
    });

    webSocket.on("error", (error) => {
      console.error("WebSocket client error.", error);
    });
  });

  webSocketServer.on("error", (error) => {
    console.error("WebSocket server error.", error);
  });

  return webSocketServer;
}

function createProofOfConceptMessage(): ProofOfConceptMessage {
  return {
    type: "connection:test",
    sentAt: new Date().toISOString(),
    payload: {
      message: "PitWall backend WebSocket proof of concept connected."
    }
  };
}

function getRequestPathname(url: string | undefined): string {
  if (!url) {
    return "/";
  }

  return new URL(url, "http://localhost").pathname;
}
