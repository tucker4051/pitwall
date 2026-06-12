import type { CurrentRaceState } from "./types.js";

export const DEFAULT_STALE_THRESHOLD_MS = 4_000;

export function createInitialCurrentRaceState(
  dataMode: CurrentRaceState["connection"]["dataMode"],
  staleThresholdMs = DEFAULT_STALE_THRESHOLD_MS
): CurrentRaceState {
  return {
    connection: {
      status: "disconnected",
      dataMode,
      lastUpdate: null,
      lastMessageReceivedAt: null,
      isStale: false,
      staleThresholdMs
    },
    meeting: {
      meetingKey: null,
      name: null,
      officialName: null,
      circuitKey: null,
      circuitShortName: null,
      circuitImage: null,
      circuitInfoUrl: null,
      circuitType: null,
      countryCode: null,
      countryName: null,
      countryFlag: null,
      location: null,
      dateStart: null,
      dateEnd: null,
      gmtOffset: null,
      year: null
    },
    session: {
      meetingKey: null,
      sessionKey: null,
      name: null,
      type: null,
      dateStart: null,
      dateEnd: null,
      driverMetadataStatus: "idle"
    },
    drivers: new Map(),
    timing: {
      lap: null,
      drivers: []
    },
    trackPositions: new Map(),
    weather: null,
    telemetry: new Map(),
    tyreStints: new Map(),
    raceControlMessages: []
  };
}
