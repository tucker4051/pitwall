import type { SourceMessage } from "../messages/source-message-types.js";
import type { OpenF1InternalSession, OpenF1RestClient } from "./openf1-rest-client.js";
import { createOpenF1RestClient } from "./openf1-rest-client.js";
import type { OpenF1Config } from "./openf1-config.js";
import { createOpenF1TimingSeeder, type OpenF1TimingSeeder } from "./openf1-timing-seed.js";
import type { OpenF1TokenManager } from "./openf1-token-manager.js";

export type OpenF1SessionMismatchEvent = {
  readonly meetingKey: number | null;
  readonly selectedSessionKey: number | null;
  readonly candidateSessionKey: number;
  readonly sourceType: SourceMessage["type"];
};

export type OpenF1SessionTransitionManager = {
  readonly handleSessionMismatch: (event: OpenF1SessionMismatchEvent) => Promise<void>;
};

export type OpenF1SessionTransitionManagerOptions = {
  readonly onSourceMessage: (message: SourceMessage) => void;
  readonly now?: () => Date;
};

const RECHECK_COOLDOWN_MS = 15_000;
const REPEATED_CANDIDATE_THRESHOLD = 2;

export function createOpenF1LiveSessionTransitionManager(
  config: OpenF1Config,
  tokenManager: OpenF1TokenManager,
  options: OpenF1SessionTransitionManagerOptions
): OpenF1SessionTransitionManager {
  const restClient = createOpenF1RestClient(config, tokenManager);
  const timingSeeder = createOpenF1TimingSeeder(restClient);

  return createOpenF1SessionTransitionManager(restClient, timingSeeder, options);
}

export function createOpenF1SessionTransitionManager(
  restClient: OpenF1RestClient,
  timingSeeder: OpenF1TimingSeeder,
  options: OpenF1SessionTransitionManagerOptions
): OpenF1SessionTransitionManager {
  const sessionsByMeeting = new Map<number, readonly OpenF1InternalSession[]>();
  const inFlightChecks = new Set<string>();
  const lastCheckAtByCandidate = new Map<string, number>();
  const candidateCounts = new Map<string, number>();
  const now = options.now ?? (() => new Date());

  return {
    async handleSessionMismatch(event: OpenF1SessionMismatchEvent): Promise<void> {
      if (!event.meetingKey || !event.selectedSessionKey) {
        logSessionSwitchDecision(event, "ignored", "missing-selected-context");
        return;
      }

      if (event.candidateSessionKey === event.selectedSessionKey) {
        return;
      }

      const transitionKey = `${event.meetingKey}:${event.candidateSessionKey}`;
      const candidateCount = (candidateCounts.get(transitionKey) ?? 0) + 1;
      candidateCounts.set(transitionKey, candidateCount);

      if (inFlightChecks.has(transitionKey)) {
        logSessionSwitchDecision(event, "ignored", "check-in-flight");
        return;
      }

      const nowMs = now().getTime();
      const lastCheckAt = lastCheckAtByCandidate.get(transitionKey);

      if (lastCheckAt && nowMs - lastCheckAt < RECHECK_COOLDOWN_MS && !sessionsByMeeting.has(event.meetingKey)) {
        logSessionSwitchDecision(event, "ignored", "cooldown");
        return;
      }

      inFlightChecks.add(transitionKey);
      lastCheckAtByCandidate.set(transitionKey, nowMs);
      logSessionSwitchDecision(event, "refresh-started", "validating-candidate-session");

      try {
        const sessions = await getSessionsForMeeting(restClient, sessionsByMeeting, event.meetingKey, event.candidateSessionKey);
        const candidateSession = sessions.find((session) => session.sessionKey === event.candidateSessionKey);

        if (!candidateSession) {
          logSessionSwitchDecision(event, "ignored", "candidate-not-in-meeting");
          return;
        }

        const shouldSwitch =
          event.candidateSessionKey > event.selectedSessionKey ||
          isSessionActive(candidateSession, now()) ||
          candidateCount >= REPEATED_CANDIDATE_THRESHOLD;

        if (!shouldSwitch) {
          logSessionSwitchDecision(event, "ignored", "candidate-not-newer-active-or-repeated");
          return;
        }

        await switchToSession(restClient, timingSeeder, options.onSourceMessage, event.meetingKey, candidateSession);
        logSessionSwitchDecision(event, "switched", "candidate-accepted");
      } catch (error: unknown) {
        console.warn("OpenF1 live session transition check failed.", {
          selectedSessionKey: event.selectedSessionKey,
          candidateSessionKey: event.candidateSessionKey,
          sourceType: event.sourceType,
          message: getSafeErrorMessage(error)
        });
      } finally {
        inFlightChecks.delete(transitionKey);
      }
    }
  };
}

async function getSessionsForMeeting(
  restClient: OpenF1RestClient,
  sessionsByMeeting: Map<number, readonly OpenF1InternalSession[]>,
  meetingKey: number,
  candidateSessionKey: number
): Promise<readonly OpenF1InternalSession[]> {
  const cachedSessions = sessionsByMeeting.get(meetingKey);

  if (cachedSessions?.some((session) => session.sessionKey === candidateSessionKey)) {
    return cachedSessions;
  }

  const refreshedSessions = await restClient.fetchSessionsForMeeting(meetingKey);
  sessionsByMeeting.set(meetingKey, refreshedSessions);

  return refreshedSessions;
}

async function switchToSession(
  restClient: OpenF1RestClient,
  timingSeeder: OpenF1TimingSeeder,
  onSourceMessage: (message: SourceMessage) => void,
  meetingKey: number,
  session: OpenF1InternalSession
): Promise<void> {
  const sessionRecordedAt = new Date().toISOString();

  onSourceMessage({
    type: "openf1:session",
    recordedAt: sessionRecordedAt,
    metadata: {
      source: "openf1",
      topic: "v1/sessions",
      meetingKey,
      sessionKey: session.sessionKey,
      receivedAt: sessionRecordedAt
    },
    payload: {
      meetingKey,
      sessionKey: session.sessionKey,
      sessionName: session.sessionName,
      sessionType: session.sessionType,
      dateStart: session.dateStart,
      dateEnd: session.dateEnd
    }
  });

  const drivers = await restClient.fetchDriversForSession(session.sessionKey);
  const driversRecordedAt = new Date().toISOString();

  onSourceMessage({
    type: "openf1:drivers",
    recordedAt: driversRecordedAt,
    metadata: {
      source: "openf1",
      topic: "v1/drivers",
      meetingKey,
      sessionKey: session.sessionKey,
      receivedAt: driversRecordedAt
    },
    payload: {
      drivers
    }
  });

  const timingSeedMessage = await timingSeeder.seedSessionTiming(meetingKey, session);

  if (timingSeedMessage) {
    onSourceMessage(timingSeedMessage);
  }
}

function isSessionActive(session: OpenF1InternalSession, now: Date): boolean {
  const startMs = parseDateMs(session.dateStart);
  const endMs = parseDateMs(session.dateEnd);
  const nowMs = now.getTime();

  return startMs !== null && startMs <= nowMs && (endMs === null || nowMs <= endMs);
}

function parseDateMs(value: string | undefined): number | null {
  if (!value) {
    return null;
  }

  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : parsed;
}

function logSessionSwitchDecision(
  event: OpenF1SessionMismatchEvent,
  decision: "ignored" | "refresh-started" | "switched",
  reason: string
): void {
  console.log("OpenF1 live session transition candidate checked.", {
    selectedSessionKey: event.selectedSessionKey,
    candidateSessionKey: event.candidateSessionKey,
    sourceType: event.sourceType,
    decision,
    reason
  });
}

function getSafeErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}
