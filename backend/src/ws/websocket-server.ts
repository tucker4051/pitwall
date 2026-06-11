import type { Server } from "node:http";

import { WebSocket, WebSocketServer } from "ws";

import type { AppConfig } from "../config/env.js";
import { createMockSourceMessages } from "../mock/mock-messages.js";
import { createInitialCurrentRaceState } from "../state/current-race-state.js";
import {
  applyMockMessageToState,
  createConnectionDashboardMessage,
  createDashboardMessageFromState,
  markStateStaleIfNeeded
} from "../state/state-updater.js";

type WebSocketServerOptions = {
  readonly dataMode: AppConfig["dataMode"];
};

const MOCK_MESSAGE_INTERVAL_MS = 2_500;
const MOCK_STALE_CHECK_INTERVAL_MS = 500;
const MOCK_STALE_PAUSE_AFTER_SEQUENCE = 2;
const MOCK_STALE_PAUSE_MS = 5_500;

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
  let currentRaceState = createInitialCurrentRaceState("mock");
  let stalePauseUntil = 0;
  let hasSimulatedStalePause = false;

  const sendMockMessages = () => {
    const now = Date.now();

    if (stalePauseUntil > now) {
      return;
    }

    if (sequence === MOCK_STALE_PAUSE_AFTER_SEQUENCE && !hasSimulatedStalePause) {
      hasSimulatedStalePause = true;
      stalePauseUntil = now + MOCK_STALE_PAUSE_MS;
      console.log("Mock source messages paused to simulate stale data.");
      return;
    }

    for (const message of createMockSourceMessages(sequence)) {
      currentRaceState = applyMockMessageToState(currentRaceState, message);
      sendJson(webSocket, createDashboardMessageFromState(currentRaceState, message.type, new Date().toISOString()));
    }

    sequence += 1;
  };

  sendMockMessages();

  const mockMessageInterval = setInterval(sendMockMessages, MOCK_MESSAGE_INTERVAL_MS);
  const staleCheckInterval = setInterval(() => {
    const staleResult = markStateStaleIfNeeded(currentRaceState);

    if (!staleResult.didChange) {
      return;
    }

    currentRaceState = staleResult.state;
    sendJson(webSocket, createConnectionDashboardMessage(currentRaceState, new Date().toISOString()));
  }, MOCK_STALE_CHECK_INTERVAL_MS);

  return () => {
    clearInterval(mockMessageInterval);
    clearInterval(staleCheckInterval);
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
