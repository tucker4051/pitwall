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
          type: message.payload.sessionType,
          driverMetadataStatus: "ready"
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

    case "openf1:session": {
      const nextSessionKey = message.payload.sessionKey ?? state.session.sessionKey;
      const sessionKeyChanged = Boolean(
        nextSessionKey !== null &&
        nextSessionKey !== undefined &&
        state.session.sessionKey !== nextSessionKey
      );
      const baseState = sessionKeyChanged ? resetSessionScopedState(state) : state;

      if (sessionKeyChanged) {
        console.log("OpenF1 session transition detected. Session-scoped state reset.", {
          previousSessionKey: state.session.sessionKey,
          nextSessionKey
        });
      }

      return {
        ...baseState,
        connection: createFreshConnectionState(state.connection, message.recordedAt),
        session: {
          meetingKey: message.payload.meetingKey ?? baseState.session.meetingKey,
          sessionKey: nextSessionKey,
          name: message.payload.sessionName,
          type: message.payload.sessionType,
          dateStart: message.payload.dateStart ?? baseState.session.dateStart,
          dateEnd: message.payload.dateEnd ?? baseState.session.dateEnd,
          driverMetadataStatus: nextSessionKey ? "loading" : "idle"
        }
      };
    }

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
      if (isMessageForDifferentSession(state, message)) {
        logDroppedSessionScopedMessage(state, message);
        return state;
      }

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
      if (isMessageForDifferentSession(state, message)) {
        logDroppedSessionScopedMessage(state, message);
        return state;
      }

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
      if (isMessageForDifferentSession(state, message)) {
        logDroppedSessionScopedMessage(state, message);
        return state;
      }

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
      if (isMessageForDifferentSession(state, message)) {
        logDroppedSessionScopedMessage(state, message);
        return state;
      }

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
      if (isMessageForDifferentSession(state, message)) {
        logDroppedSessionScopedMessage(state, message);
        return state;
      }

      const incomingSessionKey = normalizeMetadataKey(message.metadata.sessionKey);
      const shouldReplaceDriverList = Boolean(
        incomingSessionKey !== null &&
        state.session.sessionKey !== null &&
        incomingSessionKey === state.session.sessionKey
      );
      const drivers = shouldReplaceDriverList ? new Map<string, DriverState>() : new Map(state.drivers);

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
          teamColour: driver.teamColour,
          headshotUrl: driver.headshotUrl
        });
      }

      const timingDrivers = state.timing.drivers
        .filter((timingDriver) => !shouldReplaceDriverList || drivers.has(String(timingDriver.driverNumber)))
        .map((timingDriver) => {
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
            intervalUpdatedAt: timingDriver.intervalUpdatedAt,
            lastLapTime: timingDriver.lastLapTime,
            bestLapTime: timingDriver.bestLapTime,
            bestLapDuration: timingDriver.bestLapDuration,
            latestLapDuration: timingDriver.latestLapDuration,
            latestLapNumber: timingDriver.latestLapNumber,
            latestLapUpdatedAt: timingDriver.latestLapUpdatedAt,
            latestSector1Duration: timingDriver.latestSector1Duration,
            latestSector2Duration: timingDriver.latestSector2Duration,
            latestSector3Duration: timingDriver.latestSector3Duration,
            latestI1Speed: timingDriver.latestI1Speed,
            latestI2Speed: timingDriver.latestI2Speed,
            latestSpeedTrap: timingDriver.latestSpeedTrap,
            latestIsPitOutLap: timingDriver.latestIsPitOutLap,
            latestInterval: timingDriver.latestInterval
          };
        });

      return {
        ...state,
        connection: createFreshConnectionState(state.connection, message.recordedAt),
        session: {
          ...state.session,
          driverMetadataStatus: "ready"
        },
        drivers,
        timing: {
          ...state.timing,
          drivers: sortTimingDrivers(timingDrivers)
        }
      };
    }

    case "openf1:position": {
      if (isMessageForDifferentSession(state, message)) {
        logDroppedSessionScopedMessage(state, message);
        return state;
      }

      const drivers = new Map(state.drivers);
      const timingDrivers = [...state.timing.drivers];

      for (const position of message.payload.positions) {
        const key = String(position.driverNumber);
        const existingDriver = drivers.get(key);
        const existingTimingDriver = findTimingDriver(timingDrivers, position.driverNumber);
        const incomingPositionUpdatedAt = position.updatedAt ?? message.recordedAt;

        if (!shouldApplyPositionUpdate(existingDriver, existingTimingDriver, incomingPositionUpdatedAt)) {
          console.log("OpenF1 position update dropped because an equal or newer position exists.", {
            driverNumber: position.driverNumber,
            position: position.position,
            sessionKey: message.metadata.sessionKey,
            updatedAt: incomingPositionUpdatedAt
          });
          continue;
        }

        const abbreviation = existingDriver?.abbreviation ?? existingTimingDriver?.abbreviation ?? String(position.driverNumber);
        const nextTimingDriver: TimingDriverState = {
          ...existingTimingDriver,
          ...existingDriver,
          driverNumber: position.driverNumber,
          abbreviation,
          position: position.position,
          positionUpdatedAt: incomingPositionUpdatedAt,
          gapToLeader:
            position.position === 1
              ? "LEADER"
              : (existingTimingDriver?.gapToLeader ?? "")
        };

        drivers.set(key, {
          ...existingDriver,
          driverNumber: position.driverNumber,
          abbreviation,
          position: position.position,
          positionUpdatedAt: incomingPositionUpdatedAt
        });

        upsertTimingDriver(timingDrivers, nextTimingDriver);

        console.log("OpenF1 position update applied.", {
          driverNumber: position.driverNumber,
          position: position.position,
          sessionKey: message.metadata.sessionKey,
          updatedAt: incomingPositionUpdatedAt
        });
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
      if (isMessageForDifferentSession(state, message)) {
        logDroppedSessionScopedMessage(state, message);
        return state;
      }

      const drivers = new Map(state.drivers);
      const timingDrivers = [...state.timing.drivers];

      for (const driverUpdate of message.payload.drivers) {
        const key = String(driverUpdate.driverNumber);
        const existingDriver = drivers.get(key);
        const existingTimingDriver = findTimingDriver(timingDrivers, driverUpdate.driverNumber);
        const abbreviation = existingDriver?.abbreviation ?? existingTimingDriver?.abbreviation ?? String(driverUpdate.driverNumber);
        const lapMerge = mergeLapTiming(existingTimingDriver, driverUpdate, message.recordedAt, message.metadata.sessionKey);
        const intervalMerge = mergeIntervalTiming(existingTimingDriver, driverUpdate, message.recordedAt, message.metadata.sessionKey);
        const nextTimingDriver: TimingDriverState = {
          ...existingTimingDriver,
          ...existingDriver,
          driverNumber: driverUpdate.driverNumber,
          abbreviation,
          position: driverUpdate.position ?? existingDriver?.position ?? existingTimingDriver?.position ?? 0,
          gapToLeader: driverUpdate.gapToLeader ?? existingTimingDriver?.gapToLeader ?? "",
          intervalToAhead: intervalMerge.intervalToAhead,
          intervalUpdatedAt: intervalMerge.intervalUpdatedAt,
          latestInterval: intervalMerge.latestInterval,
          lastLapTime: driverUpdate.lastLapTime ?? existingTimingDriver?.lastLapTime,
          bestLapTime: lapMerge.bestLapTime ?? driverUpdate.bestLapTime ?? existingTimingDriver?.bestLapTime,
          bestLapDuration: lapMerge.bestLapDuration,
          latestLapDuration: lapMerge.latestLapDuration,
          latestLapNumber: lapMerge.latestLapNumber,
          latestLapUpdatedAt: lapMerge.latestLapUpdatedAt,
          latestSector1Duration: lapMerge.latestSector1Duration,
          latestSector2Duration: lapMerge.latestSector2Duration,
          latestSector3Duration: lapMerge.latestSector3Duration,
          latestI1Speed: lapMerge.latestI1Speed,
          latestI2Speed: lapMerge.latestI2Speed,
          latestSpeedTrap: lapMerge.latestSpeedTrap,
          latestIsPitOutLap: lapMerge.latestIsPitOutLap
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
      if (isMessageForDifferentSession(state, message)) {
        logDroppedSessionScopedMessage(state, message);
        return state;
      }

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
      if (isMessageForDifferentSession(state, message)) {
        logDroppedSessionScopedMessage(state, message);
        return state;
      }

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

function resetSessionScopedState(state: CurrentRaceState): CurrentRaceState {
  return {
    ...state,
    drivers: new Map(),
    timing: {
      lap: null,
      drivers: []
    },
    trackPositions: new Map(),
    weather: null,
    telemetry: new Map(),
    tyreStints: new Map(),
    raceControlMessages: []
  };
}

function isMessageForDifferentSession(state: CurrentRaceState, message: SourceMessage): boolean {
  if (message.metadata?.source !== "openf1") {
    return false;
  }

  if (!isSessionScopedOpenF1Message(message.type)) {
    return false;
  }

  const currentSessionKey = state.session.sessionKey;
  const messageSessionKey = normalizeMetadataKey(message.metadata.sessionKey);

  return currentSessionKey !== null && messageSessionKey !== null && messageSessionKey !== currentSessionKey;
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

function logDroppedSessionScopedMessage(state: CurrentRaceState, message: SourceMessage): void {
  console.warn("OpenF1 session-scoped message dropped for non-current session.", {
    sourceType: message.type,
    selectedSessionKey: state.session.sessionKey,
    messageSessionKey: message.metadata?.sessionKey
  });
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

function shouldApplyPositionUpdate(
  existingDriver: DriverState | undefined,
  existingTimingDriver: TimingDriverState | undefined,
  incomingPositionUpdatedAt: string
): boolean {
  const existingPositionUpdatedAt = existingTimingDriver?.positionUpdatedAt ?? existingDriver?.positionUpdatedAt;

  if (!existingPositionUpdatedAt) {
    return true;
  }

  const existingMs = Date.parse(existingPositionUpdatedAt);
  const incomingMs = Date.parse(incomingPositionUpdatedAt);

  if (Number.isNaN(existingMs) || Number.isNaN(incomingMs)) {
    return true;
  }

  return incomingMs >= existingMs;
}

function mergeLapTiming(
  existingTimingDriver: TimingDriverState | undefined,
  driverUpdate: {
    readonly driverNumber: number;
    readonly lapDuration?: number;
    readonly lapNumber?: number;
    readonly lapUpdatedAt?: string;
    readonly sector1Duration?: number;
    readonly sector2Duration?: number;
    readonly sector3Duration?: number;
    readonly i1Speed?: number;
    readonly i2Speed?: number;
    readonly speedTrap?: number;
    readonly isPitOutLap?: boolean;
  },
  recordedAt: string,
  sessionKey: string | number | undefined
): LapTimingMerge {
  const existingBestLapDuration = existingTimingDriver?.bestLapDuration;

  if (driverUpdate.lapDuration === undefined) {
    return preserveLapTiming(existingTimingDriver, existingBestLapDuration);
  }

  if (!isValidLapDuration(driverUpdate.lapDuration)) {
    console.log("OpenF1 lap update dropped because lap_duration is invalid.", {
      driverNumber: driverUpdate.driverNumber,
      sessionKey,
      lapNumber: driverUpdate.lapNumber
    });

    return preserveLapTiming(existingTimingDriver, existingBestLapDuration);
  }

  const updatedAt = driverUpdate.lapUpdatedAt ?? recordedAt;
  const latestLapUpdated = isNewerLapUpdate(existingTimingDriver, driverUpdate, updatedAt);
  const bestLapUpdated =
    existingBestLapDuration === undefined || driverUpdate.lapDuration < existingBestLapDuration;

  console.log("OpenF1 lap update applied.", {
    driverNumber: driverUpdate.driverNumber,
    sessionKey,
    lapNumber: driverUpdate.lapNumber,
    bestLapUpdated
  });

  if (!bestLapUpdated) {
    console.log("OpenF1 best lap retained because new lap is slower.", {
      driverNumber: driverUpdate.driverNumber,
      sessionKey,
      lapNumber: driverUpdate.lapNumber
    });
  }

  return {
    bestLapDuration: bestLapUpdated ? driverUpdate.lapDuration : existingBestLapDuration,
    bestLapTime: bestLapUpdated ? formatLapDuration(driverUpdate.lapDuration) : existingTimingDriver?.bestLapTime,
    latestLapDuration: latestLapUpdated ? driverUpdate.lapDuration : existingTimingDriver?.latestLapDuration,
    latestLapNumber: latestLapUpdated ? driverUpdate.lapNumber : existingTimingDriver?.latestLapNumber,
    latestLapUpdatedAt: latestLapUpdated ? updatedAt : existingTimingDriver?.latestLapUpdatedAt,
    latestSector1Duration: latestLapUpdated ? driverUpdate.sector1Duration : existingTimingDriver?.latestSector1Duration,
    latestSector2Duration: latestLapUpdated ? driverUpdate.sector2Duration : existingTimingDriver?.latestSector2Duration,
    latestSector3Duration: latestLapUpdated ? driverUpdate.sector3Duration : existingTimingDriver?.latestSector3Duration,
    latestI1Speed: latestLapUpdated ? driverUpdate.i1Speed : existingTimingDriver?.latestI1Speed,
    latestI2Speed: latestLapUpdated ? driverUpdate.i2Speed : existingTimingDriver?.latestI2Speed,
    latestSpeedTrap: latestLapUpdated ? driverUpdate.speedTrap : existingTimingDriver?.latestSpeedTrap,
    latestIsPitOutLap: latestLapUpdated ? driverUpdate.isPitOutLap : existingTimingDriver?.latestIsPitOutLap
  };
}

type LapTimingMerge = Pick<
  TimingDriverState,
  | "bestLapDuration"
  | "bestLapTime"
  | "latestLapDuration"
  | "latestLapNumber"
  | "latestLapUpdatedAt"
  | "latestSector1Duration"
  | "latestSector2Duration"
  | "latestSector3Duration"
  | "latestI1Speed"
  | "latestI2Speed"
  | "latestSpeedTrap"
  | "latestIsPitOutLap"
>;

function preserveLapTiming(
  existingTimingDriver: TimingDriverState | undefined,
  existingBestLapDuration: number | undefined
): LapTimingMerge {
  return {
    bestLapDuration: existingBestLapDuration,
    bestLapTime: existingTimingDriver?.bestLapTime,
    latestLapDuration: existingTimingDriver?.latestLapDuration,
    latestLapNumber: existingTimingDriver?.latestLapNumber,
    latestLapUpdatedAt: existingTimingDriver?.latestLapUpdatedAt,
    latestSector1Duration: existingTimingDriver?.latestSector1Duration,
    latestSector2Duration: existingTimingDriver?.latestSector2Duration,
    latestSector3Duration: existingTimingDriver?.latestSector3Duration,
    latestI1Speed: existingTimingDriver?.latestI1Speed,
    latestI2Speed: existingTimingDriver?.latestI2Speed,
    latestSpeedTrap: existingTimingDriver?.latestSpeedTrap,
    latestIsPitOutLap: existingTimingDriver?.latestIsPitOutLap
  };
}

function isNewerLapUpdate(
  existingTimingDriver: TimingDriverState | undefined,
  driverUpdate: { readonly lapNumber?: number },
  updatedAt: string
): boolean {
  if (!existingTimingDriver?.latestLapNumber && !existingTimingDriver?.latestLapUpdatedAt) {
    return true;
  }

  if (
    driverUpdate.lapNumber !== undefined &&
    existingTimingDriver.latestLapNumber !== undefined &&
    driverUpdate.lapNumber !== existingTimingDriver.latestLapNumber
  ) {
    return driverUpdate.lapNumber > existingTimingDriver.latestLapNumber;
  }

  if (!existingTimingDriver.latestLapUpdatedAt) {
    return true;
  }

  return Date.parse(updatedAt) >= Date.parse(existingTimingDriver.latestLapUpdatedAt);
}

function mergeIntervalTiming(
  existingTimingDriver: TimingDriverState | undefined,
  driverUpdate: { readonly driverNumber: number; readonly intervalToAhead?: string; readonly intervalUpdatedAt?: string },
  recordedAt: string,
  sessionKey: string | number | undefined
): Pick<TimingDriverState, "intervalToAhead" | "intervalUpdatedAt" | "latestInterval"> {
  if (driverUpdate.intervalToAhead === undefined) {
    return {
      intervalToAhead: existingTimingDriver?.intervalToAhead,
      intervalUpdatedAt: existingTimingDriver?.intervalUpdatedAt,
      latestInterval: existingTimingDriver?.latestInterval
    };
  }

  const updatedAt = driverUpdate.intervalUpdatedAt ?? recordedAt;

  if (!shouldApplyTimestampedUpdate(existingTimingDriver?.intervalUpdatedAt, updatedAt)) {
    console.log("OpenF1 interval update dropped because an equal or newer interval exists.", {
      driverNumber: driverUpdate.driverNumber,
      sessionKey,
      updatedAt
    });

    return {
      intervalToAhead: existingTimingDriver?.intervalToAhead,
      intervalUpdatedAt: existingTimingDriver?.intervalUpdatedAt,
      latestInterval: existingTimingDriver?.latestInterval
    };
  }

  console.log("OpenF1 interval update applied.", {
    driverNumber: driverUpdate.driverNumber,
    sessionKey,
    updatedAt
  });

  return {
    intervalToAhead: driverUpdate.intervalToAhead,
    intervalUpdatedAt: updatedAt,
    latestInterval: driverUpdate.intervalToAhead
  };
}

function shouldApplyTimestampedUpdate(existingUpdatedAt: string | undefined, incomingUpdatedAt: string): boolean {
  if (!existingUpdatedAt) {
    return true;
  }

  const existingMs = Date.parse(existingUpdatedAt);
  const incomingMs = Date.parse(incomingUpdatedAt);

  if (Number.isNaN(existingMs) || Number.isNaN(incomingMs)) {
    return true;
  }

  return incomingMs >= existingMs;
}

function isValidLapDuration(value: number): boolean {
  return Number.isFinite(value) && value > 0;
}

function formatLapDuration(seconds: number): string {
  if (seconds >= 60) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds - minutes * 60;
    return `${minutes}:${remainingSeconds.toFixed(3).padStart(6, "0")}`;
  }

  return seconds.toFixed(3);
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
