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
    session: {
      name: null,
      type: null
    },
    drivers: new Map(),
    timing: {
      lap: null,
      drivers: []
    },
    trackPositions: new Map(),
    raceControlMessages: []
  };
}
