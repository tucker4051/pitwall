import type { SourceMessage } from "../src/messages/source-message-types.js";
import { createOpenF1SessionTransitionManager } from "../src/openf1/openf1-session-transition.js";
import { createOpenF1TimingSeeder } from "../src/openf1/openf1-timing-seed.js";
import type { OpenF1InternalSession, OpenF1RestClient } from "../src/openf1/openf1-rest-client.js";
import { createInitialCurrentRaceState } from "../src/state/current-race-state.js";
import { applyMockMessageToState } from "../src/state/state-updater.js";

const meetingKey = 1287;
const selectedSessionKey = 11301;
const candidateSessionKey = 11302;
const recordedAt = "2026-06-13T10:00:00.000Z";

const sessions: readonly OpenF1InternalSession[] = [
  {
    meetingKey,
    sessionKey: selectedSessionKey,
    sessionName: "Practice 1",
    sessionType: "Practice",
    dateStart: "2026-06-13T08:00:00.000Z",
    dateEnd: "2026-06-13T09:00:00.000Z"
  },
  {
    meetingKey,
    sessionKey: candidateSessionKey,
    sessionName: "Practice 2",
    sessionType: "Practice",
    dateStart: "2026-06-13T10:00:00.000Z",
    dateEnd: "2026-06-13T11:00:00.000Z"
  }
];

let sessionsFetchCount = 0;
let driversFetchCount = 0;
let lapsFetchCount = 0;
const emittedMessages: SourceMessage[] = [];
let state = createInitialCurrentRaceState("live");

const restClient: OpenF1RestClient = {
  async fetchMeetingsForYear() {
    return [];
  },
  async fetchSessionsForMeeting(receivedMeetingKey) {
    sessionsFetchCount += 1;

    if (receivedMeetingKey !== meetingKey) {
      throw new Error("Unexpected meeting key while validating session transition.");
    }

    return sessions;
  },
  async fetchDriversForSession(sessionKey) {
    driversFetchCount += 1;

    if (Number(sessionKey) !== candidateSessionKey) {
      throw new Error("Unexpected session key while fetching transition drivers.");
    }

    return [
      { driverNumber: 1, nameAcronym: "VER", abbreviation: "VER", fullName: "Max Verstappen" },
      { driverNumber: 4, nameAcronym: "NOR", abbreviation: "NOR", fullName: "Lando Norris" }
    ];
  },
  async fetchLapsForSession(sessionKey) {
    lapsFetchCount += 1;

    if (Number(sessionKey) !== candidateSessionKey) {
      throw new Error("Unexpected session key while seeding transition timing.");
    }

    return [
      { driverNumber: 1, lapNumber: 4, lapDuration: 73.5, dateStart: "2026-06-13T10:10:00.000Z" },
      { driverNumber: 4, lapNumber: 5, lapDuration: 72.9, dateStart: "2026-06-13T10:11:00.000Z" }
    ];
  },
  async fetchIntervalsForSession() {
    return [];
  }
};

state = applyMessages(state, [
  createMeetingMessage(),
  createSessionMessage(sessions[0]),
  createDriversMessage(selectedSessionKey, [
    { driverNumber: 97, abbreviation: "RES", nameAcronym: "RES" }
  ]),
  createPositionMessage(selectedSessionKey, 97, 1)
]);

if (state.session.sessionKey !== selectedSessionKey || state.drivers.size !== 1 || state.timing.drivers.length !== 1) {
  throw new Error("Initial selected session state was not set up correctly.");
}

const transitionManager = createOpenF1SessionTransitionManager(restClient, createOpenF1TimingSeeder(restClient), {
  now: () => new Date("2026-06-13T10:15:00.000Z"),
  onSourceMessage: (message) => {
    emittedMessages.push(message);
    state = applyMockMessageToState(state, message);
  }
});

await transitionManager.handleSessionMismatch({
  meetingKey,
  selectedSessionKey,
  candidateSessionKey,
  sourceType: "openf1:telemetry"
});

if (sessionsFetchCount !== 1 || driversFetchCount !== 1 || lapsFetchCount !== 1) {
  throw new Error("Session transition did not perform the expected REST refresh/driver/timing seed calls.");
}

if (state.session.sessionKey !== candidateSessionKey || state.session.name !== "Practice 2") {
  throw new Error("Session transition did not switch CurrentRaceState to the candidate session.");
}

if (state.drivers.has("97") || state.timing.drivers.some((driver) => driver.driverNumber === 97)) {
  throw new Error("Previous session-scoped state was not cleared during live session transition.");
}

if (!state.drivers.has("1") || !state.drivers.has("4") || state.drivers.size !== 2) {
  throw new Error("Transition driver metadata was not fetched and merged for the new session.");
}

const driverFourTiming = state.timing.drivers.find((driver) => driver.driverNumber === 4);

if (!driverFourTiming || driverFourTiming.bestLapDuration !== 72.9) {
  throw new Error("Transition timing seed did not update timing rows for the new session.");
}

state = applyMockMessageToState(state, createPositionMessage(candidateSessionKey, 4, 2));

const updatedDriverFourTiming = state.timing.drivers.find((driver) => driver.driverNumber === 4);

if (updatedDriverFourTiming?.position !== 2) {
  throw new Error("Future messages for the switched session were not accepted.");
}

state = applyMockMessageToState(state, createPositionMessage(selectedSessionKey, 97, 1));

if (state.drivers.has("97") || state.timing.drivers.some((driver) => driver.driverNumber === 97)) {
  throw new Error("Previous selected session messages were accepted after transition.");
}

const emittedTypes = emittedMessages.map((message) => message.type);

if (!emittedTypes.includes("openf1:session") || !emittedTypes.includes("openf1:drivers") || !emittedTypes.includes("openf1:timing")) {
  throw new Error("Transition did not emit the expected session, drivers and timing messages.");
}

console.log(
  JSON.stringify({
    liveSessionTransition: "passed",
    selectedSessionKey,
    candidateSessionKey,
    finalSessionKey: state.session.sessionKey,
    sessionsFetchCount,
    driversFetchCount,
    lapsFetchCount,
    emittedTypes,
    driverCount: state.drivers.size,
    timingRowCount: state.timing.drivers.length
  })
);

function applyMessages(currentState: typeof state, messages: readonly SourceMessage[]) {
  return messages.reduce((nextState, message) => applyMockMessageToState(nextState, message), currentState);
}

function createMeetingMessage(): SourceMessage {
  return {
    type: "openf1:meeting",
    recordedAt,
    metadata: {
      source: "openf1",
      topic: "v1/meetings",
      meetingKey,
      receivedAt: recordedAt
    },
    payload: {
      meetingKey,
      meetingName: "Fixture Grand Prix"
    }
  };
}

function createSessionMessage(session: OpenF1InternalSession | undefined): SourceMessage {
  if (!session) {
    throw new Error("Missing fixture session.");
  }

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

function createDriversMessage(
  sessionKey: number,
  drivers: readonly {
    readonly driverNumber: number;
    readonly abbreviation: string;
    readonly nameAcronym: string;
  }[]
): SourceMessage {
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
      drivers
    }
  };
}

function createPositionMessage(sessionKey: number, driverNumber: number, position: number): SourceMessage {
  return {
    type: "openf1:position",
    recordedAt,
    metadata: {
      source: "openf1",
      topic: "v1/position",
      meetingKey,
      sessionKey,
      receivedAt: recordedAt
    },
    payload: {
      positions: [
        {
          driverNumber,
          position,
          updatedAt: recordedAt
        }
      ]
    }
  };
}
