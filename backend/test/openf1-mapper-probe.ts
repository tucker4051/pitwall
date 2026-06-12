import { routeSourceMessage } from "../src/messages/source-message-router.js";
import {
  createOpenF1DriverMetadataSourceMessage,
  parseOpenF1DriverMetadataResponse
} from "../src/openf1/openf1-driver-metadata.js";
import { mapOpenF1Message } from "../src/openf1/openf1-message-mapper.js";
import { parseOpenF1Meetings, parseOpenF1Sessions } from "../src/openf1/openf1-rest-client.js";
import { createInitialCurrentRaceState } from "../src/state/current-race-state.js";
import { applyMockMessageToState, createDashboardMessageFromState } from "../src/state/state-updater.js";
import { OPENF1_FIXTURE_MESSAGES, OPENF1_FIXTURE_RECEIVED_AT } from "./fixtures/openf1/openf1-fixtures.js";

const expectedDashboardTypes = new Set([
  "meeting:update",
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

const restMeeting = parseOpenF1Meetings([
  {
    meeting_key: 1234,
    meeting_name: "Fixture Grand Prix",
    meeting_official_name: "Formula 1 Fixture Grand Prix",
    circuit_key: 77,
    circuit_short_name: "Fixture Circuit",
    country_code: "GBR",
    country_name: "United Kingdom",
    location: "Silverstone",
    date_start: "2026-06-10T09:00:00+00:00",
    date_end: "2026-06-12T18:00:00+00:00",
    gmt_offset: "01:00:00",
    year: 2026
  }
])[0];
const restSession = parseOpenF1Sessions([
  {
    meeting_key: 1234,
    session_key: 9999,
    session_name: "Race",
    session_type: "Race",
    date_start: "2026-06-12T14:00:00+00:00",
    date_end: "2026-06-12T16:00:00+00:00"
  }
])[0];

if (!restMeeting || !restSession) {
  throw new Error("REST-shaped OpenF1 meeting/session fixtures failed to parse.");
}

for (const sourceMessage of [
  {
    type: "openf1:meeting" as const,
    recordedAt: OPENF1_FIXTURE_RECEIVED_AT.toISOString(),
    metadata: {
      source: "openf1" as const,
      topic: "v1/meetings" as const,
      meetingKey: restMeeting.meetingKey,
      receivedAt: OPENF1_FIXTURE_RECEIVED_AT.toISOString()
    },
    payload: restMeeting
  },
  {
    type: "openf1:session" as const,
    recordedAt: OPENF1_FIXTURE_RECEIVED_AT.toISOString(),
    metadata: {
      source: "openf1" as const,
      topic: "v1/sessions" as const,
      meetingKey: restMeeting.meetingKey,
      sessionKey: restSession.sessionKey,
      receivedAt: OPENF1_FIXTURE_RECEIVED_AT.toISOString()
    },
    payload: {
      meetingKey: restMeeting.meetingKey,
      sessionKey: restSession.sessionKey,
      sessionName: restSession.sessionName,
      sessionType: restSession.sessionType,
      dateStart: restSession.dateStart,
      dateEnd: restSession.dateEnd
    }
  }
]) {
  const routedMessage = routeSourceMessage(sourceMessage);

  if (!routedMessage.routed) {
    throw new Error(`REST-shaped ${sourceMessage.type} failed source routing.`);
  }

  state = applyMockMessageToState(state, routedMessage.message);
  dashboardTypes.add(
    createDashboardMessageFromState(
      state,
      routedMessage.message.type,
      OPENF1_FIXTURE_RECEIVED_AT.toISOString()
    ).type
  );
}

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
    meetingName: state.meeting.name,
    meetingKey: state.meeting.meetingKey,
    sessionKey: state.session.sessionKey,
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
