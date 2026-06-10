import type { CurrentRaceState } from "./types.js";

export function createInitialCurrentRaceState(dataMode: CurrentRaceState["connection"]["dataMode"]): CurrentRaceState {
  return {
    connection: {
      status: "disconnected",
      dataMode,
      lastUpdate: null
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
    raceControlMessages: []
  };
}
