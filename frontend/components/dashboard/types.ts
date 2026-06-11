export type ConnectionStatus = "connecting" | "connected" | "disconnected" | "error";

export type ConnectionState = {
  readonly status: string;
  readonly dataMode: "mock" | "live";
  readonly sessionName: string | null;
  readonly sessionType: string | null;
  readonly lastUpdate: string | null;
  readonly lastMessageReceivedAt: string | null;
  readonly isStale: boolean;
  readonly staleThresholdMs: number;
};

export type SessionState = {
  readonly name: string | null;
  readonly type: string | null;
};

export type TimingDriver = {
  readonly driverNumber?: number;
  readonly abbreviation: string;
  readonly position: number;
  readonly fullName?: string;
  readonly teamName?: string;
  readonly gapToLeader: string;
  readonly intervalToAhead?: string;
  readonly lastLapTime?: string;
  readonly bestLapTime?: string;
};

export type TimingState = {
  readonly lap: number | null;
  readonly drivers: readonly TimingDriver[];
};

export type RaceControlMessage = {
  readonly id: string;
  readonly category: "session" | "flag";
  readonly message: string;
  readonly receivedAt: string;
};

export type TrackPosition = {
  readonly abbreviation: string;
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly updatedAt: string;
};

export type WeatherState = {
  readonly airTemperature: number;
  readonly trackTemperature: number;
  readonly humidity: number;
  readonly rainfall: number;
  readonly windSpeed: number;
  readonly windDirection: number;
  readonly updatedAt: string;
};

export type TelemetrySnapshot = {
  readonly driverNumber: number;
  readonly speed: number;
  readonly throttle: number;
  readonly brake: number;
  readonly gear: number;
  readonly rpm: number;
  readonly updatedAt: string;
};

export type TyreStint = {
  readonly driverNumber: number;
  readonly compound: "soft" | "medium" | "hard" | "intermediate" | "wet";
  readonly stintNumber: number;
  readonly stintAgeLaps: number;
  readonly pitStops: number;
  readonly updatedAt: string;
};

export type DashboardState = {
  readonly connection: ConnectionState;
  readonly session: SessionState;
  readonly timing: TimingState;
  readonly drivers: readonly TimingDriver[];
  readonly raceControlMessages: readonly RaceControlMessage[];
  readonly trackPositions: readonly TrackPosition[];
  readonly weather: WeatherState | null;
  readonly telemetry: readonly TelemetrySnapshot[];
  readonly stints: readonly TyreStint[];
};

export type DashboardMessage =
  | {
      readonly type: "connection:update";
      readonly sentAt: string;
      readonly payload: ConnectionState;
    }
  | {
      readonly type: "session:update";
      readonly sentAt: string;
      readonly payload: SessionState;
    }
  | {
      readonly type: "drivers:update";
      readonly sentAt: string;
      readonly payload: {
        readonly drivers: readonly TimingDriver[];
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
        readonly messages: readonly RaceControlMessage[];
      };
    }
  | {
      readonly type: "track:update";
      readonly sentAt: string;
      readonly payload: {
        readonly positions: readonly TrackPosition[];
      };
    }
  | {
      readonly type: "weather:update";
      readonly sentAt: string;
      readonly payload: WeatherState | null;
    }
  | {
      readonly type: "telemetry:update";
      readonly sentAt: string;
      readonly payload: {
        readonly snapshots: readonly TelemetrySnapshot[];
      };
    }
  | {
      readonly type: "stints:update";
      readonly sentAt: string;
      readonly payload: {
        readonly stints: readonly TyreStint[];
      };
    };
