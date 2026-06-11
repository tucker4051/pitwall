export type ConnectionState = {
  readonly status: "connected" | "disconnected" | "reconnecting" | "stale";
  readonly dataMode: "mock" | "live";
  readonly lastUpdate: string | null;
};

export type SessionState = {
  readonly name: string | null;
  readonly type: "Race" | "Qualifying" | "Practice" | null;
};

export type DriverState = {
  readonly abbreviation: string;
  readonly position: number;
};

export type TimingDriverState = DriverState & {
  readonly gapToLeader: string;
};

export type TimingState = {
  readonly lap: number | null;
  readonly drivers: readonly TimingDriverState[];
};

export type RaceControlMessageState = {
  readonly id: string;
  readonly category: "session" | "flag";
  readonly message: string;
  readonly receivedAt: string;
};

export type TrackPositionState = {
  readonly abbreviation: string;
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly updatedAt: string;
};

export type CurrentRaceState = {
  readonly connection: ConnectionState;
  readonly session: SessionState;
  readonly drivers: ReadonlyMap<string, DriverState>;
  readonly timing: TimingState;
  readonly trackPositions: ReadonlyMap<string, TrackPositionState>;
  readonly raceControlMessages: readonly RaceControlMessageState[];
};

export type DashboardMessage =
  | {
      readonly type: "connection:update";
      readonly sentAt: string;
      readonly payload: {
        readonly status: ConnectionState["status"];
        readonly dataMode: ConnectionState["dataMode"];
        readonly sessionName: string | null;
        readonly sessionType: SessionState["type"];
        readonly lastUpdate: string | null;
      };
    }
  | {
      readonly type: "timing:update";
      readonly sentAt: string;
      readonly payload: TimingState;
    }
  | {
      readonly type: "race-control:update";
      readonly sentAt: string;
      readonly payload: {
        readonly messages: readonly RaceControlMessageState[];
      };
    }
  | {
      readonly type: "track:update";
      readonly sentAt: string;
      readonly payload: {
        readonly positions: readonly TrackPositionState[];
      };
    };
