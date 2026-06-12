import type { OpenF1InternalDriver, OpenF1SourceMessage } from "../messages/source-message-types.js";
import type { OpenF1Config } from "./openf1-config.js";
import type { OpenF1TokenManager } from "./openf1-token-manager.js";

export type OpenF1DriverMetadataFetcher = {
  readonly fetchDriversForSession: (sessionKey: string | number) => Promise<OpenF1SourceMessage & { readonly type: "openf1:drivers" }>;
};

export function createOpenF1DriverMetadataFetcher(
  config: OpenF1Config,
  tokenManager: OpenF1TokenManager
): OpenF1DriverMetadataFetcher {
  return {
    async fetchDriversForSession(sessionKey: string | number): Promise<OpenF1SourceMessage & { readonly type: "openf1:drivers" }> {
      const url = createDriversUrl(config.restBaseUrl, sessionKey);
      const accessToken = await tokenManager.getValidAccessToken();

      const response = await fetch(url, {
        headers: {
          accept: "application/json",
          authorization: `Bearer ${accessToken}`
        }
      });

      if (!response.ok) {
        throw new Error(`OpenF1 driver metadata request failed with status ${response.status}.`);
      }

      const recordedAt = new Date().toISOString();
      const drivers = parseOpenF1DriverMetadataResponse(await response.json());

      return createOpenF1DriverMetadataSourceMessage(sessionKey, drivers, recordedAt);
    }
  };
}

export function createOpenF1DriverMetadataSourceMessage(
  sessionKey: string | number,
  drivers: readonly OpenF1InternalDriver[],
  recordedAt: string
): OpenF1SourceMessage & { readonly type: "openf1:drivers" } {
  return {
    type: "openf1:drivers",
    recordedAt,
    metadata: {
      source: "openf1",
      topic: "v1/drivers",
      sessionKey,
      receivedAt: recordedAt
    },
    payload: {
      drivers
    }
  };
}

export function parseOpenF1DriverMetadataResponse(value: unknown): readonly OpenF1InternalDriver[] {
  if (!Array.isArray(value)) {
    throw new Error("OpenF1 driver metadata response must be an array.");
  }

  const drivers: OpenF1InternalDriver[] = [];

  for (const entry of value) {
    const driver = parseOpenF1DriverMetadataEntry(entry);

    if (driver) {
      drivers.push(driver);
    }
  }

  return drivers;
}

function parseOpenF1DriverMetadataEntry(value: unknown): OpenF1InternalDriver | null {
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

function createDriversUrl(restBaseUrl: string, sessionKey: string | number): string {
  const normalizedBaseUrl = restBaseUrl.endsWith("/") ? restBaseUrl : `${restBaseUrl}/`;
  const url = new URL("drivers", normalizedBaseUrl);
  url.searchParams.set("session_key", String(sessionKey));

  return url.toString();
}

function readOptionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
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
