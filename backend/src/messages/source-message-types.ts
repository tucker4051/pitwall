export type SourceMessageMetadata = {
  readonly source: "mock" | "openf1";
  readonly topic?: string;
  readonly openF1Id?: string | number;
  readonly openF1Key?: string;
  readonly meetingKey?: string | number;
  readonly sessionKey?: string | number;
  readonly receivedAt?: string;
};

export type MockSourceMessage =
  | {
      readonly type: "mock:connection";
      readonly recordedAt: string;
      readonly metadata?: SourceMessageMetadata;
      readonly payload: {
        readonly sessionName: string;
        readonly sessionType: "Race";
      };
    }
  | {
      readonly type: "mock:timing";
      readonly recordedAt: string;
      readonly metadata?: SourceMessageMetadata;
      readonly payload: {
        readonly lap: number;
        readonly drivers: readonly MockTimingDriver[];
      };
    }
  | {
      readonly type: "mock:race-control";
      readonly recordedAt: string;
      readonly metadata?: SourceMessageMetadata;
      readonly payload: {
        readonly messages: readonly MockRaceControlMessage[];
      };
    }
  | {
      readonly type: "mock:location";
      readonly recordedAt: string;
      readonly metadata?: SourceMessageMetadata;
      readonly payload: {
        readonly positions: readonly MockTrackPosition[];
      };
    }
  | {
      readonly type: "mock:weather";
      readonly recordedAt: string;
      readonly metadata?: SourceMessageMetadata;
      readonly payload: MockWeather;
    }
  | {
      readonly type: "mock:telemetry";
      readonly recordedAt: string;
      readonly metadata?: SourceMessageMetadata;
      readonly payload: {
        readonly snapshots: readonly MockTelemetrySnapshot[];
      };
    }
  | {
      readonly type: "mock:tyre-stint";
      readonly recordedAt: string;
      readonly metadata?: SourceMessageMetadata;
      readonly payload: {
        readonly stints: readonly MockTyreStint[];
      };
    };

export type OpenF1SourceMessage =
  | {
      readonly type: "openf1:meeting";
      readonly recordedAt: string;
      readonly metadata: SourceMessageMetadata & { readonly source: "openf1"; readonly topic: "v1/meetings" };
      readonly payload: OpenF1InternalMeeting;
    }
  | {
      readonly type: "openf1:session";
      readonly recordedAt: string;
      readonly metadata: SourceMessageMetadata & { readonly source: "openf1"; readonly topic: "v1/sessions" };
      readonly payload: {
        readonly meetingKey?: number;
        readonly sessionKey?: number;
        readonly sessionName: string;
        readonly sessionType: "Race" | "Qualifying" | "Practice" | "Sprint" | "Sprint Qualifying";
        readonly dateStart?: string;
        readonly dateEnd?: string;
      };
    }
  | {
      readonly type: "openf1:drivers";
      readonly recordedAt: string;
      readonly metadata: SourceMessageMetadata & { readonly source: "openf1"; readonly topic: "v1/drivers" };
      readonly payload: {
        readonly drivers: readonly OpenF1InternalDriver[];
      };
    }
  | {
      readonly type: "openf1:position";
      readonly recordedAt: string;
      readonly metadata: SourceMessageMetadata & { readonly source: "openf1"; readonly topic: "v1/position" };
      readonly payload: {
        readonly positions: readonly OpenF1InternalPosition[];
      };
    }
  | {
      readonly type: "openf1:timing";
      readonly recordedAt: string;
      readonly metadata: SourceMessageMetadata & {
        readonly source: "openf1";
        readonly topic: "v1/laps" | "v1/intervals";
      };
      readonly payload: {
        readonly lap: number | null;
        readonly drivers: readonly OpenF1InternalTimingDriver[];
      };
    }
  | {
      readonly type: "openf1:location";
      readonly recordedAt: string;
      readonly metadata: SourceMessageMetadata & { readonly source: "openf1"; readonly topic: "v1/location" };
      readonly payload: {
        readonly positions: readonly MockTrackPosition[];
      };
    }
  | {
      readonly type: "openf1:race-control";
      readonly recordedAt: string;
      readonly metadata: SourceMessageMetadata & { readonly source: "openf1"; readonly topic: "v1/race_control" };
      readonly payload: {
        readonly messages: readonly OpenF1InternalRaceControlMessage[];
      };
    }
  | {
      readonly type: "openf1:telemetry";
      readonly recordedAt: string;
      readonly metadata: SourceMessageMetadata & { readonly source: "openf1"; readonly topic: "v1/car_data" };
      readonly payload: {
        readonly snapshots: readonly MockTelemetrySnapshot[];
      };
    }
  | {
      readonly type: "openf1:tyre-stint";
      readonly recordedAt: string;
      readonly metadata: SourceMessageMetadata & { readonly source: "openf1"; readonly topic: "v1/stints" };
      readonly payload: {
        readonly stints: readonly MockTyreStint[];
      };
    }
  | {
      readonly type: "openf1:pit";
      readonly recordedAt: string;
      readonly metadata: SourceMessageMetadata & { readonly source: "openf1"; readonly topic: "v1/pit" };
      readonly payload: {
        readonly stints: readonly MockTyreStint[];
      };
    }
  | {
      readonly type: "openf1:weather";
      readonly recordedAt: string;
      readonly metadata: SourceMessageMetadata & { readonly source: "openf1"; readonly topic: "v1/weather" };
      readonly payload: MockWeather;
    };

export type SourceMessage = MockSourceMessage | OpenF1SourceMessage;
export type MockSourceMessageType = MockSourceMessage["type"];
export type SourceMessageType = SourceMessage["type"];

export type MockTimingDriver = {
  readonly position: number;
  readonly abbreviation: string;
  readonly gapToLeader: string;
  readonly intervalToAhead?: string;
  readonly latestInterval?: string;
};

export type MockRaceControlMessage = {
  readonly id: string;
  readonly category: "session" | "flag";
  readonly message: string;
};

export type MockTrackPosition = {
  readonly abbreviation: string;
  readonly x: number;
  readonly y: number;
  readonly z: number;
};

export type MockWeather = {
  readonly airTemperature: number;
  readonly trackTemperature: number;
  readonly humidity: number;
  readonly rainfall: number;
  readonly windSpeed: number;
  readonly windDirection: number;
};

export type MockTelemetrySnapshot = {
  readonly driverNumber: number;
  readonly speed: number;
  readonly throttle: number;
  readonly brake: number;
  readonly gear: number;
  readonly rpm: number;
};

export type MockTyreCompound = "soft" | "medium" | "hard" | "intermediate" | "wet";

export type MockTyreStint = {
  readonly driverNumber: number;
  readonly compound: MockTyreCompound;
  readonly stintNumber: number;
  readonly stintAgeLaps: number;
  readonly pitStops: number;
  readonly lapStart?: number;
  readonly lapEnd?: number;
  readonly tyreAgeAtStart?: number;
};

export type OpenF1InternalDriver = {
  readonly driverNumber: number;
  readonly nameAcronym?: string;
  readonly abbreviation: string;
  readonly fullName?: string;
  readonly broadcastName?: string;
  readonly teamName?: string;
  readonly teamColour?: string;
  readonly headshotUrl?: string;
};

export type OpenF1InternalMeeting = {
  readonly meetingKey: number;
  readonly meetingName: string;
  readonly meetingOfficialName?: string;
  readonly circuitKey?: number;
  readonly circuitShortName?: string;
  readonly circuitImage?: string;
  readonly circuitInfoUrl?: string;
  readonly circuitType?: string;
  readonly countryCode?: string;
  readonly countryName?: string;
  readonly countryFlag?: string;
  readonly location?: string;
  readonly dateStart?: string;
  readonly dateEnd?: string;
  readonly gmtOffset?: string;
  readonly year?: number;
};

export type OpenF1InternalPosition = {
  readonly driverNumber: number;
  readonly position: number;
  readonly updatedAt?: string;
};

export type OpenF1InternalTimingDriver = {
  readonly driverNumber: number;
  readonly position?: number;
  readonly gapToLeader?: string;
  readonly intervalToAhead?: string;
  readonly intervalUpdatedAt?: string;
  readonly lapDuration?: number;
  readonly lapNumber?: number;
  readonly lapUpdatedAt?: string;
  readonly lastLapTime?: string;
  readonly bestLapTime?: string;
  readonly sector1Duration?: number;
  readonly sector2Duration?: number;
  readonly sector3Duration?: number;
  readonly i1Speed?: number;
  readonly i2Speed?: number;
  readonly speedTrap?: number;
  readonly isPitOutLap?: boolean;
};

export type OpenF1InternalRaceControlMessage = {
  readonly id: string;
  readonly category: "session" | "flag";
  readonly message: string;
  readonly qualifyingPhase?: 1 | 2 | 3;
};

export const MOCK_SOURCE_MESSAGE_TYPES = [
  "mock:connection",
  "mock:timing",
  "mock:race-control",
  "mock:location",
  "mock:weather",
  "mock:telemetry",
  "mock:tyre-stint"
] as const satisfies readonly MockSourceMessageType[];

export const SOURCE_MESSAGE_TYPES = [
  ...MOCK_SOURCE_MESSAGE_TYPES,
  "openf1:meeting",
  "openf1:session",
  "openf1:drivers",
  "openf1:position",
  "openf1:timing",
  "openf1:location",
  "openf1:race-control",
  "openf1:pit",
  "openf1:telemetry",
  "openf1:tyre-stint",
  "openf1:weather"
] as const satisfies readonly SourceMessageType[];
