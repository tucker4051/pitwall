import type { Server } from "node:http";

import { WebSocket, WebSocketServer } from "ws";

import { createMockDashboardMessages } from "../mock/mock-messages.js";
import type { AppConfig } from "../config/env.js";

type WebSocketServerOptions = {
  readonly dataMode: AppConfig["dataMode"];
};

const MOCK_MESSAGE_INTERVAL_MS = 2_500;

export function attachWebSocketServer(server: Server, options: WebSocketServerOptions): WebSocketServer {
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

    let stopMockMessages: (() => void) | undefined;

    if (options.dataMode === "mock") {
      stopMockMessages = startMockMessageStream(webSocket);
    }

    webSocket.on("close", () => {
      stopMockMessages?.();
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

function startMockMessageStream(webSocket: WebSocket): () => void {
  let sequence = 0;

  const sendMockMessages = () => {
    for (const message of createMockDashboardMessages(sequence)) {
      sendJson(webSocket, message);
    }

    sequence += 1;
  };

  sendMockMessages();

  const interval = setInterval(sendMockMessages, MOCK_MESSAGE_INTERVAL_MS);

  return () => {
    clearInterval(interval);
  };
}

function sendJson(webSocket: WebSocket, message: unknown): void {
  if (webSocket.readyState !== WebSocket.OPEN) {
    return;
  }

  webSocket.send(JSON.stringify(message));
}

function getRequestPathname(url: string | undefined): string {
  if (!url) {
    return "/";
  }

  return new URL(url, "http://localhost").pathname;
}
