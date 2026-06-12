import type { SourceMessage } from "../src/messages/source-message-types.js";
import { createInitialCurrentRaceState } from "../src/state/current-race-state.js";
import { applyMockMessageToState, createDashboardMessageFromState } from "../src/state/state-updater.js";

const recordedAt = "2026-06-12T12:00:00.000Z";
const sessionA = 1111;
const sessionB = 2222;

let state = createInitialCurrentRaceState("live");

state = applyMessages(state, [
  createSessionMessage(sessionA, "Practice 1"),
  createDriversMessage(sessionA, [
    { driverNumber: 1, nameAcronym: "VER", fullName: "Max Verstappen", teamName: "Red Bull Racing" },
    { driverNumber: 97, nameAcronym: "RES", fullName: "Reserve Driver", teamName: "McLaren" }
  ]),
  createPositionMessage(sessionA, 1, 1),
  createPositionMessage(sessionA, 97, 2)
]);

if (state.drivers.size !== 2 || !state.drivers.has("97")) {
  throw new Error("Session A setup did not include the reserve driver.");
}

state = applyMockMessageToState(state, createSessionMessage(sessionB, "Practice 2"));

if (state.session.sessionKey !== sessionB) {
  throw new Error("Session transition did not set the new session key.");
}

if (state.session.driverMetadataStatus !== "loading") {
  throw new Error("Session transition did not enter loading driver metadata state.");
}

assertSessionScopedStateCleared();

state = applyMessages(state, [
  createDriversMessage(sessionB, [
    { driverNumber: 1, nameAcronym: "VER", fullName: "Max Verstappen", teamName: "Red Bull Racing" },
    { driverNumber: 4, nameAcronym: "NOR", fullName: "Lando Norris", teamName: "McLaren" },
    { driverNumber: 14, nameAcronym: "ALO", fullName: "Fernando Alonso", teamName: "Aston Martin" }
  ]),
  createPositionMessage(sessionA, 97, 1),
  createPositionMessage(sessionB, 4, 2, "2026-06-12T12:01:00.000Z"),
  createPositionMessage(sessionB, 4, 3, "2026-06-12T12:02:00.000Z"),
  createPositionMessage(sessionB, 4, 9, "2026-06-12T12:01:30.000Z")
]);

if (state.drivers.has("97")) {
  throw new Error("Reserve driver from previous session leaked into the new session driver state.");
}

if (!state.drivers.has("1") || !state.drivers.has("4") || !state.drivers.has("14") || state.drivers.size !== 3) {
  throw new Error("Session B driver state does not contain only Session B drivers.");
}

if (state.timing.drivers.some((driver) => driver.driverNumber === 97)) {
  throw new Error("Previous-session reserve driver leaked into timing rows.");
}

const driversMessage = createDashboardMessageFromState(state, "openf1:drivers", recordedAt);

if (driversMessage.type !== "drivers:update" || driversMessage.payload.drivers.length !== 3) {
  throw new Error("Session B drivers:update did not contain the expected session-scoped driver list.");
}

const driverFour = state.timing.drivers.find((driver) => driver.driverNumber === 4);
const driverFourMetadata = state.drivers.get("4");
const driverFourPosition = driverFour?.position ?? driverFourMetadata?.position;

if (driverFourPosition !== 3) {
  throw new Error(`Expected latest driver 4 position to be 3, received ${driverFourPosition}.`);
}

const driverFourUpdatedAt = driverFour?.positionUpdatedAt ?? driverFourMetadata?.positionUpdatedAt;

if (driverFourUpdatedAt !== "2026-06-12T12:02:00.000Z") {
  throw new Error("Older position update replaced a newer driver 4 position.");
}

const driverFourDashboard = driversMessage.payload.drivers.find((driver) => driver.driverNumber === 4);
const driverFourDashboardPosition = driverFourDashboard?.position;

if (driverFourDashboardPosition !== 3) {
  throw new Error("drivers:update did not include the latest known position for driver 4.");
}

const unpositionedDriver = driversMessage.payload.drivers.find((driver) => driver.driverNumber === 14);

if (!unpositionedDriver || unpositionedDriver.position !== 0) {
  throw new Error("Driver without position data was not preserved as an unpositioned session driver.");
}

console.log(
  JSON.stringify({
    sessionScopedState: "passed",
    sessionKey: state.session.sessionKey,
    driverMetadataStatus: state.session.driverMetadataStatus,
    driverCount: state.drivers.size,
    timingRowCount: state.timing.drivers.length,
    latestDriverFourPosition: driverFourPosition,
    previousReservePresent: state.drivers.has("97")
  })
);

function assertSessionScopedStateCleared(): void {
  if (
    state.drivers.size > 0 ||
    state.timing.drivers.length > 0 ||
    state.trackPositions.size > 0 ||
    state.telemetry.size > 0 ||
    state.tyreStints.size > 0 ||
    state.raceControlMessages.length > 0
  ) {
    throw new Error("Session-scoped state was not cleared on session transition.");
  }
}

function applyMessages(currentState: typeof state, messages: readonly SourceMessage[]) {
  return messages.reduce((nextState, message) => applyMockMessageToState(nextState, message), currentState);
}

function createSessionMessage(sessionKey: number, sessionName: string): SourceMessage {
  return {
    type: "openf1:session",
    recordedAt,
    metadata: {
      source: "openf1",
      topic: "v1/sessions",
      meetingKey: 1000,
      sessionKey,
      receivedAt: recordedAt
    },
    payload: {
      meetingKey: 1000,
      sessionKey,
      sessionName,
      sessionType: "Practice",
      dateStart: recordedAt,
      dateEnd: recordedAt
    }
  };
}

function createDriversMessage(
  sessionKey: number,
  drivers: readonly {
    readonly driverNumber: number;
    readonly nameAcronym: string;
    readonly fullName: string;
    readonly teamName: string;
  }[]
): SourceMessage {
  return {
    type: "openf1:drivers",
    recordedAt,
    metadata: {
      source: "openf1",
      topic: "v1/drivers",
      meetingKey: 1000,
      sessionKey,
      receivedAt: recordedAt
    },
    payload: {
      drivers: drivers.map((driver) => ({
        driverNumber: driver.driverNumber,
        nameAcronym: driver.nameAcronym,
        abbreviation: driver.nameAcronym,
        fullName: driver.fullName,
        teamName: driver.teamName
      }))
    }
  };
}

function createPositionMessage(
  sessionKey: number,
  driverNumber: number,
  position: number,
  updatedAt = recordedAt
): SourceMessage {
  return {
    type: "openf1:position",
    recordedAt,
    metadata: {
      source: "openf1",
      topic: "v1/position",
      meetingKey: 1000,
      sessionKey,
      receivedAt: recordedAt
    },
    payload: {
      positions: [
        {
          driverNumber,
          position,
          updatedAt
        }
      ]
    }
  };
}
