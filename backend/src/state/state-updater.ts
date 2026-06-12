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
          ...state.session,
          name: message.payload.sessionName,
          type: message.payload.sessionType
        }
      };

    case "openf1:meeting":
      return {
        ...state,
        connection: createFreshConnectionState(state.connection, message.recordedAt),
        meeting: {
          meetingKey: message.payload.meetingKey,
          name: message.payload.meetingName,
          officialName: message.payload.meetingOfficialName ?? null,
          circuitKey: message.payload.circuitKey ?? null,
          circuitShortName: message.payload.circuitShortName ?? null,
          circuitImage: message.payload.circuitImage ?? null,
          circuitInfoUrl: message.payload.circuitInfoUrl ?? null,
          circuitType: message.payload.circuitType ?? null,
          countryCode: message.payload.countryCode ?? null,
          countryName: message.payload.countryName ?? null,
          countryFlag: message.payload.countryFlag ?? null,
          location: message.payload.location ?? null,
          dateStart: message.payload.dateStart ?? null,
          dateEnd: message.payload.dateEnd ?? null,
          gmtOffset: message.payload.gmtOffset ?? null,
          year: message.payload.year ?? null
        }
      };

    case "openf1:session":
      return {
        ...state,
        connection: createFreshConnectionState(state.connection, message.recordedAt),
        session: {
          meetingKey: message.payload.meetingKey ?? state.session.meetingKey,
          sessionKey: message.payload.sessionKey ?? state.session.sessionKey,
          name: message.payload.sessionName,
          type: message.payload.sessionType,
          dateStart: message.payload.dateStart ?? state.session.dateStart,
          dateEnd: message.payload.dateEnd ?? state.session.dateEnd
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
      const nextMessages = mergeRaceControlMessages(
        state.raceControlMessages,
        message.payload.messages.map((raceControlMessage) => ({
          ...raceControlMessage,
          receivedAt: message.recordedAt
        }))
      );

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
      const trackPositions = new Map(state.trackPositions);

      for (const position of message.payload.positions) {
        trackPositions.set(position.abbreviation, {
          ...position,
          updatedAt: message.recordedAt
        });
      }

      logLiveMergeDiagnostics(
        message.type,
        message.payload.positions.map((position) => Number(position.abbreviation)).filter(Number.isFinite),
        state.drivers.size,
        state.timing.drivers.length
      );

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
      const telemetry = new Map(state.telemetry);

      for (const snapshot of message.payload.snapshots) {
        telemetry.set(snapshot.driverNumber, {
          ...snapshot,
          updatedAt: message.recordedAt
        });
      }

      logLiveMergeDiagnostics(
        message.type,
        message.payload.snapshots.map((snapshot) => snapshot.driverNumber),
        state.drivers.size,
        state.timing.drivers.length
      );

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
      const tyreStints = new Map(state.tyreStints);

      for (const stint of message.payload.stints) {
        const existingStint = tyreStints.get(stint.driverNumber);

        tyreStints.set(stint.driverNumber, {
          ...existingStint,
          ...stint,
          updatedAt: message.recordedAt
        });
      }

      logLiveMergeDiagnostics(
        message.type,
        message.payload.stints.map((stint) => stint.driverNumber),
        state.drivers.size,
        state.timing.drivers.length
      );

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

      logLiveMergeDiagnostics(
        message.type,
        message.payload.stints.map((stint) => stint.driverNumber),
        state.drivers.size,
        state.timing.drivers.length
      );

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
          nameAcronym: driver.nameAcronym,
          abbreviation: driver.abbreviation,
          position: existingDriver?.position ?? 0,
          broadcastName: driver.broadcastName,
          fullName: driver.fullName,
          teamName: driver.teamName,
          teamColour: driver.teamColour
        });
      }

      const timingDrivers = state.timing.drivers.map((timingDriver) => {
        if (!timingDriver.driverNumber) {
          return timingDriver;
        }

        const driver = drivers.get(String(timingDriver.driverNumber));

        if (!driver) {
          return timingDriver;
        }

        return {
          ...timingDriver,
          ...driver,
          gapToLeader: timingDriver.gapToLeader,
          intervalToAhead: timingDriver.intervalToAhead,
          lastLapTime: timingDriver.lastLapTime,
          bestLapTime: timingDriver.bestLapTime
        };
      });

      return {
        ...state,
        connection: createFreshConnectionState(state.connection, message.recordedAt),
        drivers,
        timing: {
          ...state.timing,
          drivers: sortTimingDrivers(timingDrivers)
        }
      };
    }

    case "openf1:position": {
      const drivers = new Map(state.drivers);
      const timingDrivers = [...state.timing.drivers];

      for (const position of message.payload.positions) {
        const key = String(position.driverNumber);
        const existingDriver = drivers.get(key);
        const existingTimingDriver = findTimingDriver(timingDrivers, position.driverNumber);
        const abbreviation = existingDriver?.abbreviation ?? existingTimingDriver?.abbreviation ?? String(position.driverNumber);
        const nextTimingDriver: TimingDriverState = {
          ...existingTimingDriver,
          ...existingDriver,
          driverNumber: position.driverNumber,
          abbreviation,
          position: position.position,
          gapToLeader:
            position.position === 1
              ? "LEADER"
              : (existingTimingDriver?.gapToLeader ?? "")
        };

        drivers.set(key, {
          ...existingDriver,
          driverNumber: position.driverNumber,
          abbreviation,
          position: position.position
        });

        upsertTimingDriver(timingDrivers, nextTimingDriver);
      }

      logLiveMergeDiagnostics(message.type, message.payload.positions.map((position) => position.driverNumber), drivers.size, timingDrivers.length);

      return {
        ...state,
        connection: createFreshConnectionState(state.connection, message.recordedAt),
        drivers,
        timing: {
          ...state.timing,
          drivers: sortTimingDrivers(timingDrivers)
        }
      };
    }

    case "openf1:timing": {
      const drivers = new Map(state.drivers);
      const timingDrivers = [...state.timing.drivers];

      for (const driverUpdate of message.payload.drivers) {
        const key = String(driverUpdate.driverNumber);
        const existingDriver = drivers.get(key);
        const existingTimingDriver = findTimingDriver(timingDrivers, driverUpdate.driverNumber);
        const abbreviation = existingDriver?.abbreviation ?? existingTimingDriver?.abbreviation ?? String(driverUpdate.driverNumber);
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

        upsertTimingDriver(timingDrivers, nextTimingDriver);
      }

      logLiveMergeDiagnostics(message.type, message.payload.drivers.map((driver) => driver.driverNumber), drivers.size, timingDrivers.length);

      return {
        ...state,
        connection: createFreshConnectionState(state.connection, message.recordedAt),
        drivers,
        timing: {
          lap: message.payload.lap ?? state.timing.lap,
          drivers: sortTimingDrivers(timingDrivers)
        }
      };
    }

    case "openf1:race-control": {
      const nextMessages = mergeRaceControlMessages(
        state.raceControlMessages,
        message.payload.messages.map((raceControlMessage) => ({
          ...raceControlMessage,
          receivedAt: message.recordedAt
        }))
      );

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

    case "openf1:meeting":
      return {
        type: "meeting:update",
        sentAt,
        payload: state.meeting
      };

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
        sessionName: state.session.name ?? state.meeting.name,
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

function mergeRaceControlMessages(
  existingMessages: readonly RaceControlMessageState[],
  incomingMessages: readonly RaceControlMessageState[]
): readonly RaceControlMessageState[] {
  const messagesById = new Map(existingMessages.map((message) => [message.id, message]));

  for (const message of incomingMessages) {
    messagesById.set(message.id, message);
  }

  return Array.from(messagesById.values())
    .sort((a, b) => Date.parse(b.receivedAt) - Date.parse(a.receivedAt))
    .slice(0, MAX_RACE_CONTROL_MESSAGES);
}

function findTimingDriver(
  timingDrivers: readonly TimingDriverState[],
  driverNumber: number
): TimingDriverState | undefined {
  return timingDrivers.find((driver) => driver.driverNumber === driverNumber);
}

function upsertTimingDriver(timingDrivers: TimingDriverState[], nextTimingDriver: TimingDriverState): void {
  const existingIndex = nextTimingDriver.driverNumber
    ? timingDrivers.findIndex((driver) => driver.driverNumber === nextTimingDriver.driverNumber)
    : timingDrivers.findIndex((driver) => driver.abbreviation === nextTimingDriver.abbreviation);

  if (existingIndex >= 0) {
    timingDrivers[existingIndex] = nextTimingDriver;
    return;
  }

  timingDrivers.push(nextTimingDriver);
}

function sortTimingDrivers(timingDrivers: readonly TimingDriverState[]): readonly TimingDriverState[] {
  return [...timingDrivers].sort((left, right) => {
    const leftPosition = left.position > 0 ? left.position : Number.MAX_SAFE_INTEGER;
    const rightPosition = right.position > 0 ? right.position : Number.MAX_SAFE_INTEGER;

    if (leftPosition !== rightPosition) {
      return leftPosition - rightPosition;
    }

    return left.abbreviation.localeCompare(right.abbreviation);
  });
}

function logLiveMergeDiagnostics(
  sourceType: SourceMessage["type"],
  driverNumbers: readonly number[],
  knownDriverCount: number,
  timingRowCount: number
): void {
  console.log("OpenF1 incremental update merged into CurrentRaceState.", {
    sourceType,
    driverNumbers,
    updateShape: driverNumbers.length <= 1 ? "incremental" : "multi-row",
    knownDriverCount,
    timingRowCount
  });
}
