import type { SourceMessage } from "../messages/source-message-types.js";
import type { OpenF1Config } from "./openf1-config.js";
import {
  createOpenF1RestClient,
  type OpenF1InternalSession,
  type OpenF1RestClient
} from "./openf1-rest-client.js";
import { createOpenF1TimingSeeder } from "./openf1-timing-seed.js";
import type { OpenF1TokenManager } from "./openf1-token-manager.js";

export type OpenF1ContextBootstrap = {
  readonly bootstrap: () => Promise<void>;
};

export type OpenF1ContextBootstrapOptions = {
  readonly onSourceMessage?: (message: SourceMessage) => void;
};

const MEETING_LOOKBACK_YEARS = 1;

export function createOpenF1ContextBootstrap(
  config: OpenF1Config,
  tokenManager: OpenF1TokenManager,
  options: OpenF1ContextBootstrapOptions = {}
): OpenF1ContextBootstrap {
  const restClient = createOpenF1RestClient(config, tokenManager);
  const timingSeeder = createOpenF1TimingSeeder(restClient);
  let inFlight = false;
  let completed = false;

  return {
    async bootstrap(): Promise<void> {
      if (completed || inFlight) {
        return;
      }

      inFlight = true;

      try {
        await bootstrapOpenF1Context(restClient, timingSeeder, options);
        completed = true;
      } finally {
        inFlight = false;
      }
    }
  };
}

async function bootstrapOpenF1Context(
  restClient: OpenF1RestClient,
  timingSeeder: ReturnType<typeof createOpenF1TimingSeeder>,
  options: OpenF1ContextBootstrapOptions
): Promise<void> {
  const now = new Date();
  const meeting = await fetchCurrentOrLatestMeeting(restClient, now);

  if (!meeting) {
    console.warn("OpenF1 context bootstrap found no meeting metadata.");
    return;
  }

  const recordedAt = new Date().toISOString();
  options.onSourceMessage?.({
    type: "openf1:meeting",
    recordedAt,
    metadata: {
      source: "openf1",
      topic: "v1/meetings",
      meetingKey: meeting.meetingKey,
      receivedAt: recordedAt
    },
    payload: meeting
  });

  console.log("OpenF1 context bootstrap meeting selected.", {
    meetingKey: meeting.meetingKey,
    year: meeting.year,
    hasDateStart: Boolean(meeting.dateStart),
    hasDateEnd: Boolean(meeting.dateEnd)
  });

  const sessions = await restClient.fetchSessionsForMeeting(meeting.meetingKey);
  const session = selectCurrentOrLatestSession(sessions, now);

  console.log("OpenF1 context bootstrap sessions fetched.", {
    meetingKey: meeting.meetingKey,
    sessionCount: sessions.length,
    selectedSessionKey: session?.sessionKey ?? null
  });

  if (!session) {
    return;
  }

  const sessionRecordedAt = new Date().toISOString();
  options.onSourceMessage?.({
    type: "openf1:session",
    recordedAt: sessionRecordedAt,
    metadata: {
      source: "openf1",
      topic: "v1/sessions",
      meetingKey: meeting.meetingKey,
      sessionKey: session.sessionKey,
      receivedAt: sessionRecordedAt
    },
    payload: {
      meetingKey: meeting.meetingKey,
      sessionKey: session.sessionKey,
      sessionName: session.sessionName,
      sessionType: session.sessionType,
      dateStart: session.dateStart,
      dateEnd: session.dateEnd
    }
  });

  const drivers = await restClient.fetchDriversForSession(session.sessionKey);
  const driversRecordedAt = new Date().toISOString();

  options.onSourceMessage?.({
    type: "openf1:drivers",
    recordedAt: driversRecordedAt,
    metadata: {
      source: "openf1",
      topic: "v1/drivers",
      meetingKey: meeting.meetingKey,
      sessionKey: session.sessionKey,
      receivedAt: driversRecordedAt
    },
    payload: {
      drivers
    }
  });

  console.log("OpenF1 context bootstrap drivers fetched.", {
    meetingKey: meeting.meetingKey,
    sessionKey: session.sessionKey,
    driverCount: drivers.length
  });

  const timingSeedMessage = await timingSeeder.seedSessionTiming(meeting.meetingKey, session);

  if (timingSeedMessage) {
    options.onSourceMessage?.(timingSeedMessage);
  }
}

async function fetchCurrentOrLatestMeeting(restClient: OpenF1RestClient, now: Date) {
  const currentYear = now.getUTCFullYear();

  for (let offset = 0; offset <= MEETING_LOOKBACK_YEARS; offset += 1) {
    const year = currentYear - offset;
    const meetings = await restClient.fetchMeetingsForYear(year);
    const meeting = selectCurrentOrLatestMeeting(meetings, now);

    console.log("OpenF1 context bootstrap meetings fetched.", {
      year,
      meetingCount: meetings.length,
      selectedMeetingKey: meeting?.meetingKey ?? null
    });

    if (meeting) {
      return meeting;
    }
  }

  return null;
}

function selectCurrentOrLatestMeeting<TMeeting extends { readonly dateStart?: string; readonly dateEnd?: string }>(
  meetings: readonly TMeeting[],
  now: Date
): TMeeting | null {
  return selectCurrentOrLatestByDates(meetings, now);
}

function selectCurrentOrLatestSession(
  sessions: readonly OpenF1InternalSession[],
  now: Date
): OpenF1InternalSession | null {
  return selectCurrentOrLatestByDates(sessions, now);
}

function selectCurrentOrLatestByDates<TValue extends { readonly dateStart?: string; readonly dateEnd?: string }>(
  values: readonly TValue[],
  now: Date
): TValue | null {
  if (values.length === 0) {
    return null;
  }

  const nowMs = now.getTime();
  const current = values.find((value) => {
    const startMs = parseDateMs(value.dateStart);
    const endMs = parseDateMs(value.dateEnd);

    return startMs !== null && startMs <= nowMs && (endMs === null || nowMs <= endMs);
  });

  if (current) {
    return current;
  }

  const datedValues = values
    .map((value) => ({ value, startMs: parseDateMs(value.dateStart) }))
    .filter((entry): entry is { readonly value: TValue; readonly startMs: number } => entry.startMs !== null)
    .sort((left, right) => right.startMs - left.startMs);

  const latestPast = datedValues.find((entry) => entry.startMs <= nowMs);

  if (latestPast) {
    return latestPast.value;
  }

  return datedValues[datedValues.length - 1]?.value ?? values[values.length - 1] ?? null;
}

function parseDateMs(value: string | undefined): number | null {
  if (!value) {
    return null;
  }

  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : parsed;
}
