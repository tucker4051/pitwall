export type SourceMessageMetadata = {
  readonly source: "mock" | "openf1";
  readonly topic?: string;
  readonly openF1Id?: string | number;
  readonly openF1Key?: string;
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

export type MockTyreCompound = "soft" | "medium" | "hard";

export type MockTyreStint = {
  readonly driverNumber: number;
  readonly compound: MockTyreCompound;
  readonly stintNumber: number;
  readonly stintAgeLaps: number;
  readonly pitStops: number;
};

export type OpenF1InternalDriver = {
  readonly driverNumber: number;
  readonly abbreviation: string;
  readonly fullName?: string;
  readonly teamName?: string;
};

export type OpenF1InternalPosition = {
  readonly driverNumber: number;
  readonly position: number;
};

export type OpenF1InternalRaceControlMessage = {
  readonly id: string;
  readonly category: "session" | "flag";
  readonly message: string;
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
  "openf1:drivers",
  "openf1:position",
  "openf1:location",
  "openf1:race-control",
  "openf1:telemetry",
  "openf1:tyre-stint",
  "openf1:weather"
] as const satisfies readonly SourceMessageType[];
