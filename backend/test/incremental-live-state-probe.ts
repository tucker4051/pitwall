import { createInitialCurrentRaceState } from "../src/state/current-race-state.js";
import { applyMockMessageToState, createDashboardMessageFromState } from "../src/state/state-updater.js";
import type { CurrentRaceState, DashboardMessage } from "../src/state/types.js";
import type { SourceMessage } from "../src/messages/source-message-types.js";

const recordedAt = "2026-06-12T12:00:00.000Z";

let state = createInitialCurrentRaceState("live");

state = applyMessages(state, [
  {
    type: "openf1:drivers",
    recordedAt,
    metadata: { source: "openf1", topic: "v1/drivers" },
    payload: {
      drivers: [
        { driverNumber: 1, nameAcronym: "VER", abbreviation: "VER", fullName: "Max Verstappen", teamName: "Red Bull Racing" },
        { driverNumber: 4, nameAcronym: "NOR", abbreviation: "NOR", fullName: "Lando Norris", teamName: "McLaren" }
      ]
    }
  },
  {
    type: "openf1:position",
    recordedAt,
    metadata: { source: "openf1", topic: "v1/position" },
    payload: {
      positions: [{ driverNumber: 1, position: 1 }]
    }
  },
  {
    type: "openf1:position",
    recordedAt,
    metadata: { source: "openf1", topic: "v1/position" },
    payload: {
      positions: [{ driverNumber: 4, position: 2 }]
    }
  },
  {
    type: "openf1:timing",
    recordedAt,
    metadata: { source: "openf1", topic: "v1/intervals" },
    payload: {
      lap: null,
      drivers: [{ driverNumber: 4, gapToLeader: "+1.234", intervalToAhead: "+1.234" }]
    }
  },
  {
    type: "openf1:location",
    recordedAt,
    metadata: { source: "openf1", topic: "v1/location" },
    payload: {
      positions: [{ abbreviation: "1", x: 10, y: 20, z: 0 }]
    }
  },
  {
    type: "openf1:location",
    recordedAt,
    metadata: { source: "openf1", topic: "v1/location" },
    payload: {
      positions: [{ abbreviation: "4", x: 30, y: 40, z: 0 }]
    }
  },
  {
    type: "openf1:telemetry",
    recordedAt,
    metadata: { source: "openf1", topic: "v1/car_data" },
    payload: {
      snapshots: [{ driverNumber: 1, speed: 280, throttle: 90, brake: 0, gear: 7, rpm: 11_000 }]
    }
  },
  {
    type: "openf1:telemetry",
    recordedAt,
    metadata: { source: "openf1", topic: "v1/car_data" },
    payload: {
      snapshots: [{ driverNumber: 4, speed: 282, throttle: 88, brake: 0, gear: 7, rpm: 11_100 }]
    }
  },
  {
    type: "openf1:tyre-stint",
    recordedAt,
    metadata: { source: "openf1", topic: "v1/stints" },
    payload: {
      stints: [{ driverNumber: 1, compound: "medium", stintNumber: 1, stintAgeLaps: 8, pitStops: 0 }]
    }
  },
  {
    type: "openf1:tyre-stint",
    recordedAt,
    metadata: { source: "openf1", topic: "v1/stints" },
    payload: {
      stints: [{ driverNumber: 4, compound: "hard", stintNumber: 1, stintAgeLaps: 7, pitStops: 0 }]
    }
  }
]);

const timingMessage = createDashboardMessageFromState(state, "openf1:timing", recordedAt);
const trackMessage = createDashboardMessageFromState(state, "openf1:location", recordedAt);
const telemetryMessage = createDashboardMessageFromState(state, "openf1:telemetry", recordedAt);
const stintsMessage = createDashboardMessageFromState(state, "openf1:tyre-stint", recordedAt);

assertDashboardSnapshot(timingMessage, "timing:update", 2);
assertDashboardSnapshot(trackMessage, "track:update", 2);
assertDashboardSnapshot(telemetryMessage, "telemetry:update", 2);
assertDashboardSnapshot(stintsMessage, "stints:update", 2);

const driverOneTiming = state.timing.drivers.find((driver) => driver.driverNumber === 1);
const driverFourTiming = state.timing.drivers.find((driver) => driver.driverNumber === 4);

if (!driverOneTiming || driverOneTiming.nameAcronym !== "VER" || driverOneTiming.abbreviation !== "VER" || driverOneTiming.position !== 1) {
  throw new Error("Driver 1 timing row was not preserved after later single-driver updates.");
}

if (!driverFourTiming || driverFourTiming.nameAcronym !== "NOR" || driverFourTiming.abbreviation !== "NOR" || driverFourTiming.gapToLeader !== "+1.234") {
  throw new Error("Driver 4 timing row did not merge interval data with existing metadata.");
}

console.log(
  JSON.stringify({
    incrementalLiveState: "passed",
    knownDriverCount: state.drivers.size,
    timingRowCount: state.timing.drivers.length,
    trackPositionCount: state.trackPositions.size,
    telemetryCount: state.telemetry.size,
    tyreStintCount: state.tyreStints.size
  })
);

function applyMessages(state: CurrentRaceState, messages: readonly SourceMessage[]): CurrentRaceState {
  return messages.reduce((currentState, message) => applyMockMessageToState(currentState, message), state);
}

function assertDashboardSnapshot(message: DashboardMessage, type: DashboardMessage["type"], expectedCount: number): void {
  if (message.type !== type) {
    throw new Error(`Expected ${type}, received ${message.type}.`);
  }

  const count =
    message.type === "timing:update"
      ? message.payload.drivers.length
      : message.type === "track:update"
        ? message.payload.positions.length
        : message.type === "telemetry:update"
          ? message.payload.snapshots.length
          : message.type === "stints:update"
            ? message.payload.stints.length
            : 0;

  if (count !== expectedCount) {
    throw new Error(`Expected ${type} to contain ${expectedCount} rows, received ${count}.`);
  }
}
