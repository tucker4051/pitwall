export type CircuitTrackPoint = {
  readonly x: number;
  readonly y: number;
};

export type CircuitTrackMarker = {
  readonly number: number;
  readonly trackPosition: CircuitTrackPoint;
};

export type CircuitInfo = {
  readonly x: readonly number[];
  readonly y: readonly number[];
  readonly rotation?: number;
  readonly circuitName?: string;
  readonly meetingName?: string;
  readonly corners: readonly CircuitTrackMarker[];
  readonly marshalSectors: readonly CircuitTrackMarker[];
  readonly marshalLights: readonly CircuitTrackMarker[];
};

export type CircuitInfoLoadState =
  | {
      readonly status: "idle" | "loading";
      readonly circuitInfo: null;
    }
  | {
      readonly status: "ready";
      readonly circuitInfo: CircuitInfo;
    }
  | {
      readonly status: "error";
      readonly circuitInfo: null;
    };
