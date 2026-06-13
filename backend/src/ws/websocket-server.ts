import type { Server } from "node:http";

import { WebSocket, WebSocketServer } from "ws";

import type { AppConfig } from "../config/env.js";
import { routeSourceMessage } from "../messages/source-message-router.js";
import type { SourceMessage } from "../messages/source-message-types.js";
import { createMockSourceMessages } from "../mock/mock-messages.js";
import { createInitialCurrentRaceState } from "../state/current-race-state.js";
import {
  applyMockMessageToState,
  createConnectionDashboardMessage,
  createDashboardMessageFromState,
  markStateStaleIfNeeded
} from "../state/state-updater.js";
import { createDashboardMessageScheduler } from "./dashboard-message-scheduler.js";

export type OpenF1SessionMismatchHandler = (event: {
  readonly meetingKey: number | null;
  readonly selectedSessionKey: number | null;
  readonly candidateSessionKey: number;
  readonly sourceType: SourceMessage["type"];
}) => void | Promise<void>;

type WebSocketServerOptions = {
  readonly dataMode: AppConfig["dataMode"];
  readonly onOpenF1SessionMismatch?: OpenF1SessionMismatchHandler;
};

export type PitWallWebSocketServer = WebSocketServer & {
  readonly processSourceMessage: (sourceMessage: SourceMessage) => void;
};

const MOCK_MESSAGE_INTERVAL_MS = 2_500;
const MOCK_STALE_CHECK_INTERVAL_MS = 500;
const MOCK_STALE_PAUSE_AFTER_SEQUENCE = 2;
const MOCK_STALE_PAUSE_MS = 5_500;

export function attachWebSocketServer(server: Server, options: WebSocketServerOptions): PitWallWebSocketServer {
  const webSocketServer = new WebSocketServer({ noServer: true });
  let currentRaceState = createInitialCurrentRaceState(options.dataMode);
  const dashboardMessageScheduler = createDashboardMessageScheduler((message) => {
    broadcastJson(webSocketServer, message);
    console.log("Dashboard message emitted to WebSocket clients.", {
      type: message.type,
      clients: getOpenClientCount(webSocketServer)
    });
  });

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
    console.log("WebSocket client connected.", {
      clients: getOpenClientCount(webSocketServer)
    });

    const connectionMessage = createConnectionDashboardMessage(currentRaceState, new Date().toISOString());
    sendJson(webSocket, connectionMessage);
    console.log("Initial connection dashboard message sent.", {
      type: connectionMessage.type,
      dataMode: options.dataMode,
      clients: getOpenClientCount(webSocketServer)
    });

    sendInitialDashboardSnapshot(webSocket, currentRaceState);

    webSocket.on("close", () => {
      console.log("WebSocket client disconnected.", {
        clients: getOpenClientCount(webSocketServer)
      });
    });

    webSocket.on("error", (error) => {
      console.error("WebSocket client error.", error);
    });
  });

  webSocketServer.on("error", (error) => {
    console.error("WebSocket server error.", error);
  });

  const processSourceMessage = (sourceMessage: SourceMessage): void => {
    const routedMessage = routeSourceMessage(sourceMessage);

    if (!routedMessage.routed) {
      return;
    }

    console.log("Source message routed.", {
      sourceType: routedMessage.message.type,
      source: routedMessage.message.metadata?.source ?? "unknown"
    });

    if (shouldDropOpenF1ContextMismatch(currentRaceState, routedMessage.message, options.onOpenF1SessionMismatch)) {
      return;
    }

    currentRaceState = applyMockMessageToState(currentRaceState, routedMessage.message);
    console.log("CurrentRaceState updated from source message.", {
      sourceType: routedMessage.message.type,
      dataMode: currentRaceState.connection.dataMode,
      trackPositions: currentRaceState.trackPositions.size,
      timingDrivers: currentRaceState.timing.drivers.length,
      clients: getOpenClientCount(webSocketServer)
    });

    const dashboardMessage = createDashboardMessageFromState(
      currentRaceState,
      routedMessage.message.type,
      new Date().toISOString()
    );

    console.log("Dashboard message scheduled.", {
      sourceType: routedMessage.message.type,
      dashboardType: dashboardMessage.type,
      clients: getOpenClientCount(webSocketServer)
    });

    dashboardMessageScheduler.schedule(dashboardMessage);
  };

  if (options.dataMode === "mock") {
    startMockMessageStream(processSourceMessage);
  }

  setInterval(() => {
    const staleResult = markStateStaleIfNeeded(currentRaceState);

    if (!staleResult.didChange) {
      return;
    }

    currentRaceState = staleResult.state;
    dashboardMessageScheduler.schedule(createConnectionDashboardMessage(currentRaceState, new Date().toISOString()));
  }, MOCK_STALE_CHECK_INTERVAL_MS);

  return Object.assign(webSocketServer, {
    processSourceMessage
  });
}

function sendInitialDashboardSnapshot(
  webSocket: WebSocket,
  currentRaceState: Parameters<typeof createConnectionDashboardMessage>[0]
): void {
  const sentAt = new Date().toISOString();
  const messages = [];

  if (currentRaceState.meeting.meetingKey) {
    messages.push(createDashboardMessageFromState(currentRaceState, "openf1:meeting", sentAt));
  }

  if (currentRaceState.session.name || currentRaceState.session.type) {
    messages.push(createDashboardMessageFromState(currentRaceState, "openf1:session", sentAt));
  }

  if (currentRaceState.drivers.size > 0) {
    messages.push(createDashboardMessageFromState(currentRaceState, "openf1:drivers", sentAt));
  }

  if (currentRaceState.timing.drivers.length > 0) {
    messages.push(createDashboardMessageFromState(currentRaceState, "openf1:timing", sentAt));
  }

  for (const message of messages) {
    sendJson(webSocket, message);
  }

  if (messages.length > 0) {
    console.log("Initial dashboard snapshot sent.", {
      messageTypes: messages.map((message) => message.type),
      meetingKey: currentRaceState.meeting.meetingKey,
      sessionKey: currentRaceState.session.sessionKey,
      driverCount: currentRaceState.drivers.size,
      timingRowCount: currentRaceState.timing.drivers.length
    });
  }
}

function shouldDropOpenF1ContextMismatch(
  currentRaceState: Parameters<typeof createConnectionDashboardMessage>[0],
  sourceMessage: SourceMessage,
  onOpenF1SessionMismatch: OpenF1SessionMismatchHandler | undefined
): boolean {
  if (sourceMessage.metadata?.source !== "openf1") {
    return false;
  }

  if (!isSessionScopedOpenF1Message(sourceMessage.type)) {
    return false;
  }

  const messageMeetingKey = normalizeMetadataKey(sourceMessage.metadata.meetingKey);
  const messageSessionKey = normalizeMetadataKey(sourceMessage.metadata.sessionKey);
  const currentMeetingKey = currentRaceState.meeting.meetingKey;
  const currentSessionKey = currentRaceState.session.sessionKey;

  if (currentMeetingKey && messageMeetingKey && messageMeetingKey !== currentMeetingKey) {
    console.warn("OpenF1 source meeting_key differs from selected context.", {
      sourceType: sourceMessage.type,
      messageMeetingKey,
      selectedMeetingKey: currentMeetingKey
    });
    return true;
  }

  if (currentSessionKey && messageSessionKey && messageSessionKey !== currentSessionKey) {
    console.warn("OpenF1 source session_key differs from selected context. Dropping session-scoped message.", {
      sourceType: sourceMessage.type,
      messageSessionKey,
      selectedSessionKey: currentSessionKey
    });
    void onOpenF1SessionMismatch?.({
      meetingKey: currentMeetingKey,
      selectedSessionKey: currentSessionKey,
      candidateSessionKey: messageSessionKey,
      sourceType: sourceMessage.type
    });
    return true;
  }

  return false;
}

function isSessionScopedOpenF1Message(type: SourceMessage["type"]): boolean {
  return (
    type === "openf1:drivers" ||
    type === "openf1:position" ||
    type === "openf1:timing" ||
    type === "openf1:location" ||
    type === "openf1:race-control" ||
    type === "openf1:pit" ||
    type === "openf1:telemetry" ||
    type === "openf1:tyre-stint" ||
    type === "openf1:weather"
  );
}

function normalizeMetadataKey(value: string | number | undefined): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value !== "string" || value.length === 0) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function startMockMessageStream(processSourceMessage: (sourceMessage: SourceMessage) => void): void {
  let sequence = 0;
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

    for (const sourceMessage of createMockSourceMessages(sequence)) {
      processSourceMessage(sourceMessage);
    }

    sequence += 1;
  };

  sendMockMessages();
  setInterval(sendMockMessages, MOCK_MESSAGE_INTERVAL_MS);
}

function sendJson(webSocket: WebSocket, message: unknown): void {
  if (webSocket.readyState !== WebSocket.OPEN) {
    return;
  }

  webSocket.send(JSON.stringify(message));
}

function broadcastJson(webSocketServer: WebSocketServer, message: unknown): void {
  for (const client of webSocketServer.clients) {
    sendJson(client, message);
  }
}

function getOpenClientCount(webSocketServer: WebSocketServer): number {
  return Array.from(webSocketServer.clients).filter((client) => client.readyState === WebSocket.OPEN).length;
}

function getRequestPathname(url: string | undefined): string {
  if (!url) {
    return "/";
  }

  return new URL(url, "http://localhost").pathname;
}
