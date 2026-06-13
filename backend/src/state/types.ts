export type ConnectionState = {
  readonly status: "connected" | "disconnected" | "reconnecting" | "stale";
  readonly dataMode: "mock" | "live";
  readonly lastUpdate: string | null;
  readonly lastMessageReceivedAt: string | null;
  readonly isStale: boolean;
  readonly staleThresholdMs: number;
};

export type SessionState = {
  readonly meetingKey: number | null;
  readonly sessionKey: number | null;
  readonly name: string | null;
  readonly type: "Race" | "Qualifying" | "Practice" | "Sprint" | "Sprint Qualifying" | null;
  readonly dateStart: string | null;
  readonly dateEnd: string | null;
  readonly driverMetadataStatus: "idle" | "loading" | "ready" | "error";
};

export type MeetingState = {
  readonly meetingKey: number | null;
  readonly name: string | null;
  readonly officialName: string | null;
  readonly circuitKey: number | null;
  readonly circuitShortName: string | null;
  readonly circuitImage: string | null;
  readonly circuitInfoUrl: string | null;
  readonly circuitType: string | null;
  readonly countryCode: string | null;
  readonly countryName: string | null;
  readonly countryFlag: string | null;
  readonly location: string | null;
  readonly dateStart: string | null;
  readonly dateEnd: string | null;
  readonly gmtOffset: string | null;
  readonly year: number | null;
};

export type DriverState = {
  readonly driverNumber?: number;
  readonly nameAcronym?: string;
  readonly abbreviation: string;
  readonly position: number;
  readonly positionUpdatedAt?: string;
  readonly fullName?: string;
  readonly broadcastName?: string;
  readonly teamName?: string;
  readonly teamColour?: string;
  readonly headshotUrl?: string;
};

export type TimingDriverState = DriverState & {
  readonly gapToLeader: string;
  readonly intervalToAhead?: string;
  readonly lastLapTime?: string;
  readonly bestLapTime?: string;
  readonly bestLapDuration?: number;
  readonly latestLapDuration?: number;
  readonly latestLapNumber?: number;
  readonly latestLapUpdatedAt?: string;
  readonly latestInterval?: string;
  readonly intervalUpdatedAt?: string;
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

export type WeatherState = {
  readonly airTemperature: number;
  readonly trackTemperature: number;
  readonly humidity: number;
  readonly rainfall: number;
  readonly windSpeed: number;
  readonly windDirection: number;
  readonly updatedAt: string;
};

export type TelemetrySnapshotState = {
  readonly driverNumber: number;
  readonly speed: number;
  readonly throttle: number;
  readonly brake: number;
  readonly gear: number;
  readonly rpm: number;
  readonly updatedAt: string;
};

export type TelemetryState = ReadonlyMap<number, TelemetrySnapshotState>;

export type TyreCompound = "soft" | "medium" | "hard" | "intermediate" | "wet";

export type TyreStintState = {
  readonly driverNumber: number;
  readonly compound: TyreCompound;
  readonly stintNumber: number;
  readonly stintAgeLaps: number;
  readonly pitStops: number;
  readonly lapStart?: number;
  readonly lapEnd?: number;
  readonly tyreAgeAtStart?: number;
  readonly updatedAt: string;
};

export type TyreStintsState = ReadonlyMap<number, TyreStintState>;

export type CurrentRaceState = {
  readonly connection: ConnectionState;
  readonly meeting: MeetingState;
  readonly session: SessionState;
  readonly drivers: ReadonlyMap<string, DriverState>;
  readonly timing: TimingState;
  readonly trackPositions: ReadonlyMap<string, TrackPositionState>;
  readonly weather: WeatherState | null;
  readonly telemetry: TelemetryState;
  readonly tyreStints: TyreStintsState;
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
        readonly lastMessageReceivedAt: string | null;
        readonly isStale: boolean;
        readonly staleThresholdMs: number;
      };
    }
  | {
      readonly type: "timing:update";
      readonly sentAt: string;
      readonly payload: TimingState;
    }
  | {
      readonly type: "meeting:update";
      readonly sentAt: string;
      readonly payload: MeetingState;
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
        readonly drivers: readonly DriverState[];
      };
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
        readonly snapshots: readonly TelemetrySnapshotState[];
      };
    }
  | {
      readonly type: "stints:update";
      readonly sentAt: string;
      readonly payload: {
        readonly stints: readonly TyreStintState[];
      };
    };
