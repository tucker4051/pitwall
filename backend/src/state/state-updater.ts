import type { SourceMessage } from "../messages/source-message-types.js";
import type {
  ConnectionState,
  CurrentRaceState,
  DashboardMessage,
  DriverState,
  RaceControlMessageState,
  TelemetrySnapshotState,
  TimingDriverState,
  TrackPositionState,
  TyreStintState
} from "./types.js";

const MAX_RACE_CONTROL_MESSAGES = 10;

export function applyMockMessageToState(state: CurrentRaceState, message: SourceMessage): CurrentRaceState {
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

    case "openf1:session":
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

    case "openf1:location": {
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

    case "mock:telemetry": {
      const telemetry = new Map<number, TelemetrySnapshotState>();

      for (const snapshot of message.payload.snapshots) {
        telemetry.set(snapshot.driverNumber, {
          ...snapshot,
          updatedAt: message.recordedAt
        });
      }

      return {
        ...state,
        connection: createFreshConnectionState(state.connection, message.recordedAt),
        telemetry
      };
    }

    case "openf1:telemetry": {
      const telemetry = new Map<number, TelemetrySnapshotState>();

      for (const snapshot of message.payload.snapshots) {
        telemetry.set(snapshot.driverNumber, {
          ...snapshot,
          updatedAt: message.recordedAt
        });
      }

      return {
        ...state,
        connection: createFreshConnectionState(state.connection, message.recordedAt),
        telemetry
      };
    }

    case "mock:tyre-stint": {
      const tyreStints = new Map<number, TyreStintState>();

      for (const stint of message.payload.stints) {
        tyreStints.set(stint.driverNumber, {
          ...stint,
          updatedAt: message.recordedAt
        });
      }

      return {
        ...state,
        connection: createFreshConnectionState(state.connection, message.recordedAt),
        tyreStints
      };
    }

    case "openf1:tyre-stint": {
      const tyreStints = new Map<number, TyreStintState>();

      for (const stint of message.payload.stints) {
        tyreStints.set(stint.driverNumber, {
          ...stint,
          updatedAt: message.recordedAt
        });
      }

      return {
        ...state,
        connection: createFreshConnectionState(state.connection, message.recordedAt),
        tyreStints
      };
    }

    case "openf1:pit": {
      const tyreStints = new Map(state.tyreStints);

      for (const stint of message.payload.stints) {
        const existingStint = tyreStints.get(stint.driverNumber);

        tyreStints.set(stint.driverNumber, {
          ...existingStint,
          ...stint,
          compound: existingStint?.compound ?? stint.compound,
          updatedAt: message.recordedAt
        });
      }

      return {
        ...state,
        connection: createFreshConnectionState(state.connection, message.recordedAt),
        tyreStints
      };
    }

    case "openf1:drivers": {
      const drivers = new Map(state.drivers);

      for (const driver of message.payload.drivers) {
        const key = String(driver.driverNumber);
        const existingDriver = drivers.get(key);

        drivers.set(key, {
          ...existingDriver,
          driverNumber: driver.driverNumber,
          abbreviation: driver.abbreviation,
          position: existingDriver?.position ?? 0,
          fullName: driver.fullName,
          teamName: driver.teamName
        });
      }

      return {
        ...state,
        connection: createFreshConnectionState(state.connection, message.recordedAt),
        drivers
      };
    }

    case "openf1:position": {
      const drivers = new Map(state.drivers);
      const timingDrivers = [...message.payload.positions]
        .sort((a, b) => a.position - b.position)
        .map((position) => {
          const key = String(position.driverNumber);
          const existingDriver = drivers.get(key);
          const abbreviation = existingDriver?.abbreviation ?? String(position.driverNumber);

          drivers.set(key, {
            ...existingDriver,
            driverNumber: position.driverNumber,
            abbreviation,
            position: position.position
          });

          return {
            position: position.position,
            abbreviation,
            gapToLeader: position.position === 1 ? "LEADER" : ""
          };
        });

      return {
        ...state,
        connection: createFreshConnectionState(state.connection, message.recordedAt),
        drivers,
        timing: {
          ...state.timing,
          drivers: timingDrivers
        }
      };
    }

    case "openf1:timing": {
      const drivers = new Map(state.drivers);
      const timingDrivers = [...state.timing.drivers];

      for (const driverUpdate of message.payload.drivers) {
        const key = String(driverUpdate.driverNumber);
        const existingDriver = drivers.get(key);
        const abbreviation = existingDriver?.abbreviation ?? String(driverUpdate.driverNumber);
        const existingTimingDriver = timingDrivers.find((driver) => driver.abbreviation === abbreviation);
        const nextTimingDriver: TimingDriverState = {
          ...existingTimingDriver,
          ...existingDriver,
          driverNumber: driverUpdate.driverNumber,
          abbreviation,
          position: driverUpdate.position ?? existingDriver?.position ?? existingTimingDriver?.position ?? 0,
          gapToLeader: driverUpdate.gapToLeader ?? existingTimingDriver?.gapToLeader ?? "",
          intervalToAhead: driverUpdate.intervalToAhead ?? existingTimingDriver?.intervalToAhead,
          lastLapTime: driverUpdate.lastLapTime ?? existingTimingDriver?.lastLapTime,
          bestLapTime: driverUpdate.bestLapTime ?? existingTimingDriver?.bestLapTime
        };

        drivers.set(key, {
          ...existingDriver,
          driverNumber: driverUpdate.driverNumber,
          abbreviation,
          position: nextTimingDriver.position
        });

        const existingIndex = timingDrivers.findIndex((driver) => driver.abbreviation === abbreviation);

        if (existingIndex >= 0) {
          timingDrivers[existingIndex] = nextTimingDriver;
        } else {
          timingDrivers.push(nextTimingDriver);
        }
      }

      return {
        ...state,
        connection: createFreshConnectionState(state.connection, message.recordedAt),
        drivers,
        timing: {
          lap: message.payload.lap ?? state.timing.lap,
          drivers: timingDrivers.sort((a, b) => a.position - b.position)
        }
      };
    }

    case "openf1:race-control": {
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

    case "openf1:weather":
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
  sourceType: SourceMessage["type"],
  sentAt: string
): DashboardMessage {
  switch (sourceType) {
    case "mock:connection":
      return createConnectionDashboardMessage(state, sentAt);

    case "openf1:session":
      return {
        type: "session:update",
        sentAt,
        payload: state.session
      };

    case "mock:timing":
    case "openf1:position":
    case "openf1:timing":
      return {
        type: "timing:update",
        sentAt,
        payload: state.timing
      };

    case "openf1:drivers":
      return {
        type: "drivers:update",
        sentAt,
        payload: {
          drivers: Array.from(state.drivers.values())
        }
      };

    case "mock:race-control":
    case "openf1:race-control":
      return {
        type: "race-control:update",
        sentAt,
        payload: {
          messages: state.raceControlMessages
        }
      };

    case "mock:location":
    case "openf1:location":
      return {
        type: "track:update",
        sentAt,
        payload: {
          positions: Array.from(state.trackPositions.values())
        }
      };

    case "mock:weather":
    case "openf1:weather":
      return {
        type: "weather:update",
        sentAt,
        payload: state.weather
      };

    case "mock:telemetry":
    case "openf1:telemetry":
      return {
        type: "telemetry:update",
        sentAt,
        payload: {
          snapshots: Array.from(state.telemetry.values())
        }
      };

    case "mock:tyre-stint":
    case "openf1:pit":
    case "openf1:tyre-stint":
      return {
        type: "stints:update",
        sentAt,
        payload: {
          stints: Array.from(state.tyreStints.values())
        }
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
