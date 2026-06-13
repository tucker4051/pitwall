import type { OpenF1SourceMessage } from "../messages/source-message-types.js";
import type {
  OpenF1InternalSession,
  OpenF1RestClient,
  OpenF1RestInterval,
  OpenF1RestLap,
  OpenF1RestStartingGridRow
} from "./openf1-rest-client.js";

export type OpenF1TimingSeedKind = "laps" | "intervals" | "starting_grid";

export type OpenF1TimingSeeder = {
  readonly seedSessionTiming: (
    meetingKey: number,
    session: OpenF1InternalSession
  ) => Promise<(OpenF1SourceMessage & { readonly type: "openf1:timing" }) | null>;
};

type SeedStatus = {
  readonly inFlight: Set<string>;
  readonly completed: Set<string>;
};

export function createOpenF1TimingSeeder(restClient: OpenF1RestClient): OpenF1TimingSeeder {
  const seedStatus: SeedStatus = {
    inFlight: new Set(),
    completed: new Set()
  };

  return {
    async seedSessionTiming(
      meetingKey: number,
      session: OpenF1InternalSession
    ): Promise<(OpenF1SourceMessage & { readonly type: "openf1:timing" }) | null> {
      const seedKind = getTimingSeedKind(session.sessionType);

      if (!seedKind) {
        console.log("OpenF1 timing REST seed skipped for unsupported session type.", {
          sessionKey: session.sessionKey,
          sessionType: session.sessionType
        });
        return null;
      }

      const seedKey = `${session.sessionKey}:${seedKind}`;

      if (seedStatus.completed.has(seedKey) || seedStatus.inFlight.has(seedKey)) {
        console.log("OpenF1 timing REST seed skipped because it is already complete or in-flight.", {
          sessionKey: session.sessionKey,
          sessionType: session.sessionType,
          endpoint: seedKind
        });
        return null;
      }

      seedStatus.inFlight.add(seedKey);

      console.log("OpenF1 timing REST seed started.", {
        sessionKey: session.sessionKey,
        sessionType: session.sessionType,
        endpoint: seedKind
      });

      try {
        const message =
          seedKind === "laps"
            ? await createLapSeedMessage(restClient, meetingKey, session)
            : seedKind === "starting_grid"
              ? await createStartingGridSeedMessage(restClient, meetingKey, session)
              : await createIntervalSeedMessage(restClient, meetingKey, session);

        seedStatus.completed.add(seedKey);

        console.log("OpenF1 timing REST seed succeeded.", {
          sessionKey: session.sessionKey,
          sessionType: session.sessionType,
          endpoint: seedKind,
          driverUpdates: message.payload.drivers.length
        });

        return message;
      } catch (error: unknown) {
        console.warn("OpenF1 timing REST seed failed.", {
          sessionKey: session.sessionKey,
          sessionType: session.sessionType,
          endpoint: seedKind,
          message: getSafeErrorMessage(error)
        });

        return null;
      } finally {
        seedStatus.inFlight.delete(seedKey);
      }
    }
  };
}

export function getTimingSeedKind(
  sessionType: OpenF1InternalSession["sessionType"]
): OpenF1TimingSeedKind | null {
  switch (sessionType) {
    case "Practice":
    case "Qualifying":
    case "Sprint Qualifying":
      return "laps";
    case "Race":
      return "starting_grid";
    case "Sprint":
      // TODO: Add Sprint Race grid seeding once the selected Sprint session/grid source is verified.
      return "intervals";
  }
}

export function buildBestLapSeedDrivers(laps: readonly OpenF1RestLap[]) {
  const bestLapsByDriver = new Map<number, OpenF1RestLap>();

  for (const lap of laps) {
    if (!isValidLapDuration(lap.lapDuration)) {
      continue;
    }

    const existing = bestLapsByDriver.get(lap.driverNumber);

    if (!existing || (lap.lapDuration ?? Number.MAX_SAFE_INTEGER) < (existing.lapDuration ?? Number.MAX_SAFE_INTEGER)) {
      bestLapsByDriver.set(lap.driverNumber, lap);
    }
  }

  return Array.from(bestLapsByDriver.values()).map((lap) => ({
    driverNumber: lap.driverNumber,
    lapDuration: lap.lapDuration,
    lapNumber: lap.lapNumber,
    lapUpdatedAt: lap.dateStart,
    lastLapTime: lap.lapDuration ? formatLapDuration(lap.lapDuration) : undefined
  }));
}

export function buildLatestIntervalSeedDrivers(intervals: readonly OpenF1RestInterval[]) {
  const latestIntervalsByDriver = new Map<number, OpenF1RestInterval>();

  for (const interval of intervals) {
    const existing = latestIntervalsByDriver.get(interval.driverNumber);

    if (!existing || shouldUseIncomingInterval(existing.date, interval.date)) {
      latestIntervalsByDriver.set(interval.driverNumber, interval);
    }
  }

  return Array.from(latestIntervalsByDriver.values()).map((interval) => ({
    driverNumber: interval.driverNumber,
    gapToLeader: interval.gapToLeader,
    intervalToAhead: interval.interval,
    intervalUpdatedAt: interval.date
  }));
}

export function buildStartingGridSeedDrivers(startingGridRows: readonly OpenF1RestStartingGridRow[]) {
  return startingGridRows
    .filter((row) => Number.isFinite(row.position) && row.position > 0)
    .sort((left, right) => left.position - right.position)
    .map((row) => ({
      driverNumber: row.driverNumber,
      position: row.position,
      gridPosition: row.position,
      gapToLeader: "--",
      intervalToAhead: "--"
    }));
}

async function createLapSeedMessage(
  restClient: OpenF1RestClient,
  meetingKey: number,
  session: OpenF1InternalSession
): Promise<OpenF1SourceMessage & { readonly type: "openf1:timing" }> {
  const laps = await restClient.fetchLapsForSession(session.sessionKey);
  const drivers = buildBestLapSeedDrivers(laps);
  const recordedAt = new Date().toISOString();

  console.log("OpenF1 timing REST seed rows fetched.", {
    sessionKey: session.sessionKey,
    sessionType: session.sessionType,
    endpoint: "laps",
    rowsFetched: laps.length,
    driversUpdated: drivers.length
  });

  return {
    type: "openf1:timing",
    recordedAt,
    metadata: {
      source: "openf1",
      topic: "v1/laps",
      meetingKey,
      sessionKey: session.sessionKey,
      receivedAt: recordedAt
    },
    payload: {
      lap: null,
      drivers
    }
  };
}

async function createIntervalSeedMessage(
  restClient: OpenF1RestClient,
  meetingKey: number,
  session: OpenF1InternalSession
): Promise<OpenF1SourceMessage & { readonly type: "openf1:timing" }> {
  const intervals = await restClient.fetchIntervalsForSession(session.sessionKey);
  const drivers = buildLatestIntervalSeedDrivers(intervals);
  const recordedAt = new Date().toISOString();

  console.log("OpenF1 timing REST seed rows fetched.", {
    sessionKey: session.sessionKey,
    sessionType: session.sessionType,
    endpoint: "intervals",
    rowsFetched: intervals.length,
    driversUpdated: drivers.length
  });

  return {
    type: "openf1:timing",
    recordedAt,
    metadata: {
      source: "openf1",
      topic: "v1/intervals",
      meetingKey,
      sessionKey: session.sessionKey,
      receivedAt: recordedAt
    },
    payload: {
      lap: null,
      drivers
    }
  };
}

async function createStartingGridSeedMessage(
  restClient: OpenF1RestClient,
  meetingKey: number,
  session: OpenF1InternalSession
): Promise<OpenF1SourceMessage & { readonly type: "openf1:timing" }> {
  const startingGridRows = await restClient.fetchStartingGridForSession(session.sessionKey);
  const drivers = buildStartingGridSeedDrivers(startingGridRows);
  const recordedAt = new Date().toISOString();

  console.log("OpenF1 timing REST seed rows fetched.", {
    meetingKey,
    sessionKey: session.sessionKey,
    sessionType: session.sessionType,
    endpoint: "starting_grid",
    rowsFetched: startingGridRows.length,
    driversUpdated: drivers.length
  });

  return {
    type: "openf1:timing",
    recordedAt,
    metadata: {
      source: "openf1",
      topic: "v1/starting_grid",
      meetingKey,
      sessionKey: session.sessionKey,
      receivedAt: recordedAt
    },
    payload: {
      lap: null,
      drivers
    }
  };
}

function shouldUseIncomingInterval(existingDate: string | undefined, incomingDate: string | undefined): boolean {
  if (!existingDate) {
    return true;
  }

  if (!incomingDate) {
    return false;
  }

  const existingMs = Date.parse(existingDate);
  const incomingMs = Date.parse(incomingDate);

  if (Number.isNaN(existingMs)) {
    return true;
  }

  if (Number.isNaN(incomingMs)) {
    return false;
  }

  return incomingMs >= existingMs;
}

function isValidLapDuration(value: number | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function formatLapDuration(seconds: number): string {
  if (seconds >= 60) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds - minutes * 60;
    return `${minutes}:${remainingSeconds.toFixed(3).padStart(6, "0")}`;
  }

  return seconds.toFixed(3);
}

function getSafeErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}
