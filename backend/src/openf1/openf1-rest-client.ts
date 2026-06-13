import type { OpenF1InternalDriver, OpenF1InternalMeeting } from "../messages/source-message-types.js";
import type { OpenF1Config } from "./openf1-config.js";
import type { OpenF1TokenManager } from "./openf1-token-manager.js";

export type OpenF1InternalSession = {
  readonly meetingKey?: number;
  readonly sessionKey: number;
  readonly sessionName: string;
  readonly sessionType: "Race" | "Qualifying" | "Practice" | "Sprint" | "Sprint Qualifying";
  readonly dateStart?: string;
  readonly dateEnd?: string;
};

export type OpenF1RestLap = {
  readonly driverNumber: number;
  readonly lapNumber?: number;
  readonly lapDuration?: number;
  readonly dateStart?: string;
};

export type OpenF1RestInterval = {
  readonly driverNumber: number;
  readonly interval?: string;
  readonly gapToLeader?: string;
  readonly date?: string;
};

export type OpenF1RestStartingGridRow = {
  readonly driverNumber: number;
  readonly position: number;
  readonly lapDuration?: number;
};

export type OpenF1RestClient = {
  readonly fetchMeetingsForYear: (year: number) => Promise<readonly OpenF1InternalMeeting[]>;
  readonly fetchSessionsForMeeting: (meetingKey: number) => Promise<readonly OpenF1InternalSession[]>;
  readonly fetchDriversForSession: (sessionKey: string | number) => Promise<readonly OpenF1InternalDriver[]>;
  readonly fetchLapsForSession: (sessionKey: string | number) => Promise<readonly OpenF1RestLap[]>;
  readonly fetchIntervalsForSession: (sessionKey: string | number) => Promise<readonly OpenF1RestInterval[]>;
  readonly fetchStartingGridForSession: (sessionKey: string | number) => Promise<readonly OpenF1RestStartingGridRow[]>;
};

export function createOpenF1RestClient(config: OpenF1Config, tokenManager: OpenF1TokenManager): OpenF1RestClient {
  return {
    async fetchMeetingsForYear(year: number): Promise<readonly OpenF1InternalMeeting[]> {
      const value = await fetchOpenF1Json(config, tokenManager, "meetings", { year: String(year) });
      return parseOpenF1Meetings(value);
    },

    async fetchSessionsForMeeting(meetingKey: number): Promise<readonly OpenF1InternalSession[]> {
      const value = await fetchOpenF1Json(config, tokenManager, "sessions", { meeting_key: String(meetingKey) });
      return parseOpenF1Sessions(value);
    },

    async fetchDriversForSession(sessionKey: string | number): Promise<readonly OpenF1InternalDriver[]> {
      const value = await fetchOpenF1Json(config, tokenManager, "drivers", { session_key: String(sessionKey) });
      return parseOpenF1Drivers(value);
    },

    async fetchLapsForSession(sessionKey: string | number): Promise<readonly OpenF1RestLap[]> {
      const value = await fetchOpenF1Json(config, tokenManager, "laps", { session_key: String(sessionKey) });
      return parseOpenF1Laps(value);
    },

    async fetchIntervalsForSession(sessionKey: string | number): Promise<readonly OpenF1RestInterval[]> {
      const value = await fetchOpenF1Json(config, tokenManager, "intervals", { session_key: String(sessionKey) });
      return parseOpenF1Intervals(value);
    },

    async fetchStartingGridForSession(sessionKey: string | number): Promise<readonly OpenF1RestStartingGridRow[]> {
      const value = await fetchOpenF1Json(config, tokenManager, "starting_grid", { session_key: String(sessionKey) });
      return parseOpenF1StartingGrid(value);
    }
  };
}

export function parseOpenF1Meetings(value: unknown): readonly OpenF1InternalMeeting[] {
  if (!Array.isArray(value)) {
    throw new Error("OpenF1 meetings response must be an array.");
  }

  return value.map(parseOpenF1Meeting).filter((meeting): meeting is OpenF1InternalMeeting => meeting !== null);
}

export function parseOpenF1Sessions(value: unknown): readonly OpenF1InternalSession[] {
  if (!Array.isArray(value)) {
    throw new Error("OpenF1 sessions response must be an array.");
  }

  return value.map(parseOpenF1Session).filter((session): session is OpenF1InternalSession => session !== null);
}

export function parseOpenF1Drivers(value: unknown): readonly OpenF1InternalDriver[] {
  if (!Array.isArray(value)) {
    throw new Error("OpenF1 drivers response must be an array.");
  }

  return value.map(parseOpenF1Driver).filter((driver): driver is OpenF1InternalDriver => driver !== null);
}

export function parseOpenF1Laps(value: unknown): readonly OpenF1RestLap[] {
  if (!Array.isArray(value)) {
    throw new Error("OpenF1 laps response must be an array.");
  }

  return value.map(parseOpenF1Lap).filter((lap): lap is OpenF1RestLap => lap !== null);
}

export function parseOpenF1Intervals(value: unknown): readonly OpenF1RestInterval[] {
  if (!Array.isArray(value)) {
    throw new Error("OpenF1 intervals response must be an array.");
  }

  return value.map(parseOpenF1Interval).filter((interval): interval is OpenF1RestInterval => interval !== null);
}

export function parseOpenF1StartingGrid(value: unknown): readonly OpenF1RestStartingGridRow[] {
  if (!Array.isArray(value)) {
    throw new Error("OpenF1 starting_grid response must be an array.");
  }

  return value.map(parseOpenF1StartingGridRow).filter((row): row is OpenF1RestStartingGridRow => row !== null);
}

async function fetchOpenF1Json(
  config: OpenF1Config,
  tokenManager: OpenF1TokenManager,
  path: string,
  params: Readonly<Record<string, string>>
): Promise<unknown> {
  const url = createOpenF1RestUrl(config.restBaseUrl, path, params);
  const accessToken = await tokenManager.getValidAccessToken();

  const response = await fetch(url, {
    headers: {
      accept: "application/json",
      authorization: `Bearer ${accessToken}`
    }
  });

  if (!response.ok) {
    throw new Error(`OpenF1 REST ${path} request failed with status ${response.status}.`);
  }

  return response.json();
}

function parseOpenF1Meeting(value: unknown): OpenF1InternalMeeting | null {
  if (!isRecord(value) || !isNumber(value.meeting_key) || !isString(value.meeting_name)) {
    return null;
  }

  return {
    meetingKey: value.meeting_key,
    meetingName: value.meeting_name,
    meetingOfficialName: readOptionalString(value.meeting_official_name),
    circuitKey: readOptionalNumber(value.circuit_key),
    circuitShortName: readOptionalString(value.circuit_short_name),
    circuitImage: readOptionalString(value.circuit_image),
    circuitInfoUrl: readOptionalString(value.circuit_info_url),
    circuitType: readOptionalString(value.circuit_type),
    countryCode: readOptionalString(value.country_code),
    countryName: readOptionalString(value.country_name),
    countryFlag: readOptionalString(value.country_flag),
    location: readOptionalString(value.location),
    dateStart: readOptionalString(value.date_start),
    dateEnd: readOptionalString(value.date_end),
    gmtOffset: readOptionalString(value.gmt_offset),
    year: readOptionalNumber(value.year)
  };
}

function parseOpenF1Session(value: unknown): OpenF1InternalSession | null {
  if (!isRecord(value) || !isNumber(value.session_key) || !isString(value.session_name)) {
    return null;
  }

  const sessionType = normalizeSessionType(value.session_type);

  if (!sessionType) {
    return null;
  }

  return {
    meetingKey: readOptionalNumber(value.meeting_key),
    sessionKey: value.session_key,
    sessionName: value.session_name,
    sessionType,
    dateStart: readOptionalString(value.date_start),
    dateEnd: readOptionalString(value.date_end)
  };
}

function parseOpenF1Driver(value: unknown): OpenF1InternalDriver | null {
  if (!isRecord(value) || !isNumber(value.driver_number) || !isString(value.name_acronym)) {
    return null;
  }

  return {
    driverNumber: value.driver_number,
    nameAcronym: value.name_acronym,
    abbreviation: value.name_acronym,
    broadcastName: readOptionalString(value.broadcast_name),
    fullName: readOptionalString(value.full_name),
    teamName: readOptionalString(value.team_name),
    teamColour: readOptionalString(value.team_colour),
    headshotUrl: readOptionalString(value.headshot_url)
  };
}

function parseOpenF1Lap(value: unknown): OpenF1RestLap | null {
  if (!isRecord(value) || !isNumber(value.driver_number)) {
    return null;
  }

  return {
    driverNumber: value.driver_number,
    lapNumber: readOptionalNumber(value.lap_number),
    lapDuration: readOptionalNumber(value.lap_duration),
    dateStart: readOptionalString(value.date_start)
  };
}

function parseOpenF1Interval(value: unknown): OpenF1RestInterval | null {
  if (!isRecord(value) || !isNumber(value.driver_number)) {
    return null;
  }

  return {
    driverNumber: value.driver_number,
    interval: formatInterval(value.interval),
    gapToLeader: formatInterval(value.gap_to_leader),
    date: readOptionalString(value.date)
  };
}

function parseOpenF1StartingGridRow(value: unknown): OpenF1RestStartingGridRow | null {
  if (!isRecord(value) || !isNumber(value.driver_number) || !isNumber(value.position)) {
    return null;
  }

  return {
    driverNumber: value.driver_number,
    position: value.position,
    lapDuration: readOptionalNumber(value.lap_duration)
  };
}

function createOpenF1RestUrl(
  restBaseUrl: string,
  path: string,
  params: Readonly<Record<string, string>>
): string {
  const normalizedBaseUrl = restBaseUrl.endsWith("/") ? restBaseUrl : `${restBaseUrl}/`;
  const url = new URL(path, normalizedBaseUrl);

  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  return url.toString();
}

function normalizeSessionType(
  value: unknown
): "Race" | "Qualifying" | "Practice" | "Sprint" | "Sprint Qualifying" | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.toLowerCase();

  if (normalized.includes("sprint shootout") || normalized.includes("sprint qualifying")) {
    return "Sprint Qualifying";
  }

  if (normalized.includes("sprint") && normalized.includes("race")) {
    return "Sprint";
  }

  if (normalized === "sprint") {
    return "Sprint";
  }

  if (normalized.includes("race")) {
    return "Race";
  }

  if (normalized.includes("qualifying")) {
    return "Qualifying";
  }

  if (normalized.includes("practice")) {
    return "Practice";
  }

  return undefined;
}

function readOptionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function readOptionalNumber(value: unknown): number | undefined {
  return isNumber(value) ? value : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function isNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function formatInterval(value: unknown): string | undefined {
  if (typeof value === "string" && value.length > 0) {
    return value;
  }

  if (!isNumber(value)) {
    return undefined;
  }

  return value === 0 ? "LEADER" : `+${value.toFixed(3)}`;
}
