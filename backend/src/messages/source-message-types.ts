export type MockSourceMessage =
  | {
      readonly type: "mock:connection";
      readonly recordedAt: string;
      readonly payload: {
        readonly sessionName: string;
        readonly sessionType: "Race";
      };
    }
  | {
      readonly type: "mock:timing";
      readonly recordedAt: string;
      readonly payload: {
        readonly lap: number;
        readonly drivers: readonly MockTimingDriver[];
      };
    }
  | {
      readonly type: "mock:race-control";
      readonly recordedAt: string;
      readonly payload: {
        readonly messages: readonly MockRaceControlMessage[];
      };
    }
  | {
      readonly type: "mock:location";
      readonly recordedAt: string;
      readonly payload: {
        readonly positions: readonly MockTrackPosition[];
      };
    }
  | {
      readonly type: "mock:weather";
      readonly recordedAt: string;
      readonly payload: MockWeather;
    }
  | {
      readonly type: "mock:telemetry";
      readonly recordedAt: string;
      readonly payload: {
        readonly snapshots: readonly MockTelemetrySnapshot[];
      };
    }
  | {
      readonly type: "mock:tyre-stint";
      readonly recordedAt: string;
      readonly payload: {
        readonly stints: readonly MockTyreStint[];
      };
    };

export type MockSourceMessageType = MockSourceMessage["type"];

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

export const MOCK_SOURCE_MESSAGE_TYPES = [
  "mock:connection",
  "mock:timing",
  "mock:race-control",
  "mock:location",
  "mock:weather",
  "mock:telemetry",
  "mock:tyre-stint"
] as const satisfies readonly MockSourceMessageType[];
