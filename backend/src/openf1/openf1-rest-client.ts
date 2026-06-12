import type { OpenF1InternalDriver, OpenF1InternalMeeting } from "../messages/source-message-types.js";
import type { OpenF1Config } from "./openf1-config.js";
import type { OpenF1TokenManager } from "./openf1-token-manager.js";

export type OpenF1InternalSession = {
  readonly meetingKey?: number;
  readonly sessionKey: number;
  readonly sessionName: string;
  readonly sessionType: "Race" | "Qualifying" | "Practice";
  readonly dateStart?: string;
  readonly dateEnd?: string;
};

export type OpenF1RestClient = {
  readonly fetchMeetingsForYear: (year: number) => Promise<readonly OpenF1InternalMeeting[]>;
  readonly fetchSessionsForMeeting: (meetingKey: number) => Promise<readonly OpenF1InternalSession[]>;
  readonly fetchDriversForSession: (sessionKey: string | number) => Promise<readonly OpenF1InternalDriver[]>;
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
    teamColour: readOptionalString(value.team_colour)
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

function normalizeSessionType(value: unknown): "Race" | "Qualifying" | "Practice" | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.toLowerCase();

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
