export type MockDashboardMessage =
  | {
      readonly type: "connection:update";
      readonly sentAt: string;
      readonly payload: {
        readonly status: "connected";
        readonly sessionName: string;
        readonly sessionType: "Race";
        readonly dataMode: "mock";
        readonly lastUpdate: string;
      };
    }
  | {
      readonly type: "timing:update";
      readonly sentAt: string;
      readonly payload: {
        readonly lap: number;
        readonly drivers: readonly MockTimingDriver[];
      };
    }
  | {
      readonly type: "race-control:update";
      readonly sentAt: string;
      readonly payload: {
        readonly messages: readonly MockRaceControlMessage[];
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

const MOCK_TIMING_DRIVERS: readonly MockTimingDriver[] = [
  { position: 1, abbreviation: "VER", gapToLeader: "LEADER" },
  { position: 2, abbreviation: "NOR", gapToLeader: "+1.234" },
  { position: 3, abbreviation: "LEC", gapToLeader: "+2.468" }
];

export function createMockDashboardMessages(sequence: number, sentAt = new Date()): readonly MockDashboardMessage[] {
  const timestamp = sentAt.toISOString();

  return [
    {
      type: "connection:update",
      sentAt: timestamp,
      payload: {
        status: "connected",
        sessionName: "Mock Grand Prix",
        sessionType: "Race",
        dataMode: "mock",
        lastUpdate: timestamp
      }
    },
    {
      type: "timing:update",
      sentAt: timestamp,
      payload: {
        lap: 12 + sequence,
        drivers: MOCK_TIMING_DRIVERS
      }
    },
    {
      type: "race-control:update",
      sentAt: timestamp,
      payload: {
        messages: [
          {
            id: `mock-race-control-${sequence}`,
            category: sequence % 2 === 0 ? "session" : "flag",
            message: sequence % 2 === 0 ? "Mock session running normally." : "Mock green flag conditions."
          }
        ]
      }
    }
  ];
}
