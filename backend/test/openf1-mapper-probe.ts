import { routeSourceMessage } from "../src/messages/source-message-router.js";
import {
  createOpenF1DriverMetadataSourceMessage,
  parseOpenF1DriverMetadataResponse
} from "../src/openf1/openf1-driver-metadata.js";
import { mapOpenF1Message } from "../src/openf1/openf1-message-mapper.js";
import { createInitialCurrentRaceState } from "../src/state/current-race-state.js";
import { applyMockMessageToState, createDashboardMessageFromState } from "../src/state/state-updater.js";
import { OPENF1_FIXTURE_MESSAGES, OPENF1_FIXTURE_RECEIVED_AT } from "./fixtures/openf1/openf1-fixtures.js";

const expectedDashboardTypes = new Set([
  "session:update",
  "drivers:update",
  "timing:update",
  "race-control:update",
  "weather:update",
  "track:update",
  "telemetry:update",
  "stints:update"
]);
const dashboardTypes = new Set<string>();
const sourceTypes = new Set<string>();
let state = createInitialCurrentRaceState("live");

const restDriverMetadata = parseOpenF1DriverMetadataResponse([
  {
    driver_number: 16,
    name_acronym: "LEC",
    broadcast_name: "C LECLERC",
    full_name: "Charles Leclerc",
    team_name: "Ferrari",
    team_colour: "E8002D"
  }
]);
const restDriverSourceMessage = createOpenF1DriverMetadataSourceMessage(
  9999,
  restDriverMetadata,
  OPENF1_FIXTURE_RECEIVED_AT.toISOString()
);
const routedRestDriverMessage = routeSourceMessage(restDriverSourceMessage);

if (!routedRestDriverMessage.routed) {
  throw new Error("REST-shaped OpenF1 driver metadata failed source routing.");
}

state = applyMockMessageToState(state, routedRestDriverMessage.message);
dashboardTypes.add(
  createDashboardMessageFromState(
    state,
    routedRestDriverMessage.message.type,
    OPENF1_FIXTURE_RECEIVED_AT.toISOString()
  ).type
);

for (const fixture of OPENF1_FIXTURE_MESSAGES) {
  const mappedMessage = mapOpenF1Message(fixture.topic, fixture.payload, OPENF1_FIXTURE_RECEIVED_AT);

  if (!mappedMessage.mapped) {
    throw new Error(`Fixture ${fixture.topic} failed to map: ${mappedMessage.reason}`);
  }

  const routedMessage = routeSourceMessage(mappedMessage.message);

  if (!routedMessage.routed) {
    throw new Error(`Fixture ${fixture.topic} failed source routing.`);
  }

  sourceTypes.add(routedMessage.message.type);
  state = applyMockMessageToState(state, routedMessage.message);

  const dashboardMessage = createDashboardMessageFromState(
    state,
    routedMessage.message.type,
    OPENF1_FIXTURE_RECEIVED_AT.toISOString()
  );

  dashboardTypes.add(dashboardMessage.type);
}

for (const dashboardType of expectedDashboardTypes) {
  if (!dashboardTypes.has(dashboardType)) {
    throw new Error(`Expected dashboard message ${dashboardType} was not produced.`);
  }
}

console.log(
  JSON.stringify({
    mappedFixtures: OPENF1_FIXTURE_MESSAGES.length,
    sourceTypes: Array.from(sourceTypes),
    dashboardTypes: Array.from(dashboardTypes),
    sessionName: state.session.name,
    sessionType: state.session.type,
    timingLap: state.timing.lap,
    driverCount: state.drivers.size,
    restDriverMetadataCount: restDriverMetadata.length,
    raceControlMessageCount: state.raceControlMessages.length,
    trackPositionCount: state.trackPositions.size,
    telemetryCount: state.telemetry.size,
    tyreStintCount: state.tyreStints.size,
    hasWeather: state.weather !== null
  })
);
