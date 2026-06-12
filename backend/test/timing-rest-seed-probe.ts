import type { SourceMessage } from "../src/messages/source-message-types.js";
import {
  createOpenF1TimingSeeder,
  getTimingSeedKind
} from "../src/openf1/openf1-timing-seed.js";
import type { OpenF1InternalSession, OpenF1RestClient } from "../src/openf1/openf1-rest-client.js";
import { createInitialCurrentRaceState } from "../src/state/current-race-state.js";
import { applyMockMessageToState, createDashboardMessageFromState } from "../src/state/state-updater.js";

const meetingKey = 1000;
const recordedAt = "2026-06-12T12:00:00.000Z";
const practiceSession = createSession(1111, "Practice 2", "Practice");
const raceSession = createSession(2222, "Race", "Race");

if (getTimingSeedKind(practiceSession.sessionType) !== "laps") {
  throw new Error("Practice session did not select lap REST seed logic.");
}

if (getTimingSeedKind(raceSession.sessionType) !== "intervals") {
  throw new Error("Race session did not select interval REST seed logic.");
}

let lapsFetchCount = 0;
let intervalsFetchCount = 0;

const restClient: OpenF1RestClient = {
  async fetchMeetingsForYear() {
    return [];
  },
  async fetchSessionsForMeeting() {
    return [];
  },
  async fetchDriversForSession() {
    return [];
  },
  async fetchLapsForSession(sessionKey) {
    lapsFetchCount += 1;

    if (Number(sessionKey) !== practiceSession.sessionKey) {
      throw new Error("Unexpected lap seed session key.");
    }

    return [
      { driverNumber: 1, lapNumber: 1, lapDuration: 74.2, dateStart: "2026-06-12T12:01:00.000Z" },
      { driverNumber: 1, lapNumber: 2, lapDuration: 0, dateStart: "2026-06-12T12:02:00.000Z" },
      { driverNumber: 1, lapNumber: 3, lapDuration: 73.7, dateStart: "2026-06-12T12:03:00.000Z" },
      { driverNumber: 4, lapNumber: 1, lapDuration: -1, dateStart: "2026-06-12T12:01:00.000Z" },
      { driverNumber: 4, lapNumber: 2, lapDuration: 72.9, dateStart: "2026-06-12T12:04:00.000Z" },
      { driverNumber: 4, lapNumber: 3, lapDuration: 73.4, dateStart: "2026-06-12T12:05:00.000Z" }
    ];
  },
  async fetchIntervalsForSession(sessionKey) {
    intervalsFetchCount += 1;

    if (Number(sessionKey) !== raceSession.sessionKey) {
      throw new Error("Unexpected interval seed session key.");
    }

    return [
      { driverNumber: 1, interval: undefined, date: "2026-06-12T13:01:00.000Z" },
      { driverNumber: 4, interval: "+2.000", date: "2026-06-12T13:01:00.000Z" },
      { driverNumber: 4, interval: "+1.500", date: "2026-06-12T13:02:00.000Z" },
      { driverNumber: 16, interval: "+1 LAP", date: "2026-06-12T13:03:00.000Z" },
      { driverNumber: 16, interval: "+9.000", date: "2026-06-12T13:02:00.000Z" }
    ];
  }
};

const timingSeeder = createOpenF1TimingSeeder(restClient);

const [practiceSeedMessage, duplicatePracticeSeedMessage] = await Promise.all([
  timingSeeder.seedSessionTiming(meetingKey, practiceSession),
  timingSeeder.seedSessionTiming(meetingKey, practiceSession)
]);

if (!practiceSeedMessage || duplicatePracticeSeedMessage !== null || lapsFetchCount !== 1) {
  throw new Error("Duplicate lap REST seed fetches were not avoided.");
}

if (practiceSeedMessage.metadata.topic !== "v1/laps" || practiceSeedMessage.payload.drivers.length !== 2) {
  throw new Error("Practice lap seed did not produce expected openf1:timing source message.");
}

let state = createInitialCurrentRaceState("live");
state = applyMessages(state, [
  createSessionSourceMessage(practiceSession),
  createDriversSourceMessage(practiceSession.sessionKey),
  practiceSeedMessage
]);

const driverOnePracticeTiming = state.timing.drivers.find((driver) => driver.driverNumber === 1);
const driverFourPracticeTiming = state.timing.drivers.find((driver) => driver.driverNumber === 4);

if (driverOnePracticeTiming?.bestLapDuration !== 73.7 || driverOnePracticeTiming.bestLapTime !== "1:13.700") {
  throw new Error("Practice lap seed did not retain the lowest valid best lap for driver 1.");
}

if (driverFourPracticeTiming?.bestLapDuration !== 72.9 || driverFourPracticeTiming.bestLapTime !== "1:12.900") {
  throw new Error("Practice lap seed did not ignore invalid/slower lap durations for driver 4.");
}

state = applyMockMessageToState(state, createSessionSourceMessage(raceSession));

if (state.timing.drivers.length !== 0) {
  throw new Error("Session transition did not clear previous-session lap timing seed data.");
}

const raceSeedMessage = await timingSeeder.seedSessionTiming(meetingKey, raceSession);

if (!raceSeedMessage || raceSeedMessage.metadata.topic !== "v1/intervals" || intervalsFetchCount !== 1) {
  throw new Error("Race interval seed did not produce expected openf1:timing source message.");
}

state = applyMessages(state, [
  createDriversSourceMessage(raceSession.sessionKey),
  raceSeedMessage
]);

const driverFourRaceTiming = state.timing.drivers.find((driver) => driver.driverNumber === 4);
const driverSixteenRaceTiming = state.timing.drivers.find((driver) => driver.driverNumber === 16);

if (driverFourRaceTiming?.latestInterval !== "+1.500" || driverFourRaceTiming.intervalUpdatedAt !== "2026-06-12T13:02:00.000Z") {
  throw new Error("Race interval seed did not retain the latest dated interval for driver 4.");
}

if (driverSixteenRaceTiming?.latestInterval !== "+1 LAP" || driverSixteenRaceTiming.intervalUpdatedAt !== "2026-06-12T13:03:00.000Z") {
  throw new Error("Race interval seed did not preserve string interval values by latest date.");
}

const timingMessage = createDashboardMessageFromState(state, "openf1:timing", recordedAt);

if (timingMessage.type !== "timing:update" || timingMessage.payload.drivers.length !== 3) {
  throw new Error("REST timing seed did not produce a dashboard timing:update snapshot.");
}

console.log(
  JSON.stringify({
    timingRestSeed: "passed",
    practiceSeedEndpoint: practiceSeedMessage.metadata.topic,
    raceSeedEndpoint: raceSeedMessage.metadata.topic,
    lapsFetchCount,
    intervalsFetchCount,
    practiceBestLapDrivers: practiceSeedMessage.payload.drivers.length,
    raceIntervalDrivers: raceSeedMessage.payload.drivers.length,
    dashboardMessageType: timingMessage.type
  })
);

function applyMessages(currentState: typeof state, messages: readonly SourceMessage[]) {
  return messages.reduce((nextState, message) => applyMockMessageToState(nextState, message), currentState);
}

function createSession(
  sessionKey: number,
  sessionName: string,
  sessionType: OpenF1InternalSession["sessionType"]
): OpenF1InternalSession {
  return {
    meetingKey,
    sessionKey,
    sessionName,
    sessionType,
    dateStart: recordedAt,
    dateEnd: recordedAt
  };
}

function createSessionSourceMessage(session: OpenF1InternalSession): SourceMessage {
  return {
    type: "openf1:session",
    recordedAt,
    metadata: {
      source: "openf1",
      topic: "v1/sessions",
      meetingKey,
      sessionKey: session.sessionKey,
      receivedAt: recordedAt
    },
    payload: {
      meetingKey,
      sessionKey: session.sessionKey,
      sessionName: session.sessionName,
      sessionType: session.sessionType,
      dateStart: session.dateStart,
      dateEnd: session.dateEnd
    }
  };
}

function createDriversSourceMessage(sessionKey: number): SourceMessage {
  return {
    type: "openf1:drivers",
    recordedAt,
    metadata: {
      source: "openf1",
      topic: "v1/drivers",
      meetingKey,
      sessionKey,
      receivedAt: recordedAt
    },
    payload: {
      drivers: [
        { driverNumber: 1, nameAcronym: "VER", abbreviation: "VER", fullName: "Max Verstappen" },
        { driverNumber: 4, nameAcronym: "NOR", abbreviation: "NOR", fullName: "Lando Norris" },
        { driverNumber: 16, nameAcronym: "LEC", abbreviation: "LEC", fullName: "Charles Leclerc" }
      ]
    }
  };
}
