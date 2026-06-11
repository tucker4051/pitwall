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
    };

type MockTimingDriver = {
  readonly position: number;
  readonly abbreviation: string;
  readonly gapToLeader: string;
};

type MockRaceControlMessage = {
  readonly id: string;
  readonly category: "session" | "flag";
  readonly message: string;
};

type MockTrackPosition = {
  readonly abbreviation: string;
  readonly x: number;
  readonly y: number;
  readonly z: number;
};

const MOCK_TIMING_DRIVERS: readonly MockTimingDriver[] = [
  { position: 1, abbreviation: "VER", gapToLeader: "LEADER" },
  { position: 2, abbreviation: "NOR", gapToLeader: "+1.234" },
  { position: 3, abbreviation: "LEC", gapToLeader: "+2.468" }
];

const MOCK_LOCATION_BASES: readonly MockTrackPosition[] = [
  { abbreviation: "VER", x: 12, y: 24, z: 0 },
  { abbreviation: "NOR", x: 42, y: 58, z: 0 },
  { abbreviation: "LEC", x: 70, y: 36, z: 0 }
];

export function createMockSourceMessages(sequence: number, recordedAt = new Date()): readonly MockSourceMessage[] {
  const timestamp = recordedAt.toISOString();

  return [
    {
      type: "mock:connection",
      recordedAt: timestamp,
      payload: {
        sessionName: "Mock Grand Prix",
        sessionType: "Race"
      }
    },
    {
      type: "mock:timing",
      recordedAt: timestamp,
      payload: {
        lap: 12 + sequence,
        drivers: MOCK_TIMING_DRIVERS
      }
    },
    {
      type: "mock:race-control",
      recordedAt: timestamp,
      payload: {
        messages: [
          {
            id: `mock-race-control-${sequence}`,
            category: sequence % 2 === 0 ? "session" : "flag",
            message: sequence % 2 === 0 ? "Mock session running normally." : "Mock green flag conditions."
          }
        ]
      }
    },
    {
      type: "mock:location",
      recordedAt: timestamp,
      payload: {
        positions: createMockTrackPositions(sequence)
      }
    }
  ];
}

function createMockTrackPositions(sequence: number): readonly MockTrackPosition[] {
  return MOCK_LOCATION_BASES.map((position, index) => ({
    abbreviation: position.abbreviation,
    x: wrapCoordinate(position.x + sequence * 5 + index * 2),
    y: wrapCoordinate(position.y + sequence * 3 + index * 4),
    z: position.z
  }));
}

function wrapCoordinate(value: number): number {
  return value % 100;
}
