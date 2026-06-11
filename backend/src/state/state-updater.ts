import type { MockSourceMessage } from "../mock/mock-messages.js";
import type {
  ConnectionState,
  CurrentRaceState,
  DashboardMessage,
  DriverState,
  RaceControlMessageState,
  TrackPositionState
} from "./types.js";

const MAX_RACE_CONTROL_MESSAGES = 10;

export function applyMockMessageToState(state: CurrentRaceState, message: MockSourceMessage): CurrentRaceState {
  switch (message.type) {
    case "mock:connection":
      return {
        ...state,
        connection: createFreshConnectionState(state.connection, message.recordedAt),
        session: {
          name: message.payload.sessionName,
          type: message.payload.sessionType
        }
      };

    case "mock:timing": {
      const drivers = new Map<string, DriverState>();

      for (const driver of message.payload.drivers) {
        drivers.set(driver.abbreviation, {
          abbreviation: driver.abbreviation,
          position: driver.position
        });
      }

      return {
        ...state,
        connection: createFreshConnectionState(state.connection, message.recordedAt),
        drivers,
        timing: {
          lap: message.payload.lap,
          drivers: message.payload.drivers
        }
      };
    }

    case "mock:race-control": {
      const nextMessages: readonly RaceControlMessageState[] = [
        ...message.payload.messages.map((raceControlMessage) => ({
          ...raceControlMessage,
          receivedAt: message.recordedAt
        })),
        ...state.raceControlMessages
      ].slice(0, MAX_RACE_CONTROL_MESSAGES);

      return {
        ...state,
        connection: createFreshConnectionState(state.connection, message.recordedAt),
        raceControlMessages: nextMessages
      };
    }

    case "mock:location": {
      const trackPositions = new Map<string, TrackPositionState>();

      for (const position of message.payload.positions) {
        trackPositions.set(position.abbreviation, {
          ...position,
          updatedAt: message.recordedAt
        });
      }

      return {
        ...state,
        connection: createFreshConnectionState(state.connection, message.recordedAt),
        trackPositions
      };
    }

    case "mock:weather":
      return {
        ...state,
        connection: createFreshConnectionState(state.connection, message.recordedAt),
        weather: {
          ...message.payload,
          updatedAt: message.recordedAt
        }
      };
  }
}

export function markStateStaleIfNeeded(
  state: CurrentRaceState,
  checkedAt = new Date()
): { readonly state: CurrentRaceState; readonly didChange: boolean } {
  const { lastMessageReceivedAt, staleThresholdMs } = state.connection;

  if (!lastMessageReceivedAt || state.connection.isStale) {
    return { state, didChange: false };
  }

  const elapsedMs = checkedAt.getTime() - Date.parse(lastMessageReceivedAt);

  if (elapsedMs <= staleThresholdMs) {
    return { state, didChange: false };
  }

  return {
    state: {
      ...state,
      connection: {
        ...state.connection,
        status: "stale",
        lastUpdate: checkedAt.toISOString(),
        isStale: true
      }
    },
    didChange: true
  };
}

export function createDashboardMessageFromState(
  state: CurrentRaceState,
  sourceType: MockSourceMessage["type"],
  sentAt: string
): DashboardMessage {
  switch (sourceType) {
    case "mock:connection":
      return createConnectionDashboardMessage(state, sentAt);

    case "mock:timing":
      return {
        type: "timing:update",
        sentAt,
        payload: state.timing
      };

    case "mock:race-control":
      return {
        type: "race-control:update",
        sentAt,
        payload: {
          messages: state.raceControlMessages
        }
      };

    case "mock:location":
      return {
        type: "track:update",
        sentAt,
        payload: {
          positions: Array.from(state.trackPositions.values())
        }
      };

    case "mock:weather":
      return {
        type: "weather:update",
        sentAt,
        payload: state.weather
      };
  }
}

export function createConnectionDashboardMessage(state: CurrentRaceState, sentAt: string): DashboardMessage {
  return {
    type: "connection:update",
    sentAt,
    payload: {
      status: state.connection.status,
      dataMode: state.connection.dataMode,
      sessionName: state.session.name,
      sessionType: state.session.type,
      lastUpdate: state.connection.lastUpdate,
      lastMessageReceivedAt: state.connection.lastMessageReceivedAt,
      isStale: state.connection.isStale,
      staleThresholdMs: state.connection.staleThresholdMs
    }
  };
}

function createFreshConnectionState(connection: ConnectionState, receivedAt: string): ConnectionState {
  return {
    ...connection,
    status: "connected",
    lastUpdate: receivedAt,
    lastMessageReceivedAt: receivedAt,
    isStale: false
  };
}
