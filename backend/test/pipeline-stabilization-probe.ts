import { routeSourceMessage } from "../src/messages/source-message-router.js";
import { mapOpenF1Message } from "../src/openf1/openf1-message-mapper.js";
import { createOpenF1MessageOrderTracker } from "../src/openf1/openf1-message-order.js";
import { createInitialCurrentRaceState } from "../src/state/current-race-state.js";
import { applyMockMessageToState } from "../src/state/state-updater.js";
import type { DashboardMessage } from "../src/state/types.js";
import { createDashboardMessageScheduler } from "../src/ws/dashboard-message-scheduler.js";

const receivedAt = new Date("2026-06-11T12:30:00.000Z");

await validateOpenF1IdHandling();
validateOpenF1KeyReplacement();
await validateDashboardMessageScheduling();

console.log(
  JSON.stringify({
    openF1IdHandling: "passed",
    openF1KeyReplacement: "passed",
    dashboardScheduling: "passed"
  })
);

async function validateOpenF1IdHandling(): Promise<void> {
  const tracker = createOpenF1MessageOrderTracker();

  const first = tracker.shouldProcess("v1/location", { _id: 20, _key: "location-1" });
  const duplicate = tracker.shouldProcess("v1/location", { _id: 20, _key: "location-1" });
  const older = tracker.shouldProcess("v1/location", { _id: 19, _key: "location-1" });
  const missing = tracker.shouldProcess("v1/location", { _key: "location-without-id" });
  const nextTopic = tracker.shouldProcess("v1/weather", { _id: 1, _key: "weather-latest" });

  if (!first.accepted || duplicate.accepted || older.accepted || !missing.accepted || !nextTopic.accepted) {
    throw new Error("OpenF1 _id ordering behavior did not match expectations.");
  }
}

function validateOpenF1KeyReplacement(): void {
  let state = createInitialCurrentRaceState("live");

  for (const payload of [
    {
      _id: 30,
      _key: "race-control-same-key",
      category: "Flag",
      flag: "YELLOW",
      message: "YELLOW FLAG"
    },
    {
      _id: 31,
      _key: "race-control-same-key",
      category: "Flag",
      flag: "GREEN",
      message: "GREEN FLAG"
    }
  ]) {
    const mappedMessage = mapOpenF1Message("v1/race_control", payload, receivedAt);

    if (!mappedMessage.mapped) {
      throw new Error("OpenF1 race-control fixture failed to map.");
    }

    const routedMessage = routeSourceMessage(mappedMessage.message);

    if (!routedMessage.routed) {
      throw new Error("OpenF1 race-control fixture failed to route.");
    }

    state = applyMockMessageToState(state, routedMessage.message);
  }

  if (state.raceControlMessages.length !== 1 || state.raceControlMessages[0]?.message !== "GREEN FLAG") {
    throw new Error("OpenF1 _key replacement did not replace duplicate race-control records.");
  }
}

async function validateDashboardMessageScheduling(): Promise<void> {
  const sentMessages: DashboardMessage[] = [];
  const scheduler = createDashboardMessageScheduler(
    (message) => {
      sentMessages.push(message);
    },
    { throttleIntervalMs: 25 }
  );

  scheduler.schedule(createWeatherMessage());
  scheduler.schedule(createRaceControlMessage());
  scheduler.schedule(createTrackMessage(1));
  scheduler.schedule(createTrackMessage(2));
  scheduler.schedule(createTelemetryMessage(101));
  scheduler.schedule(createTelemetryMessage(202));

  await delay(50);

  const trackMessages = sentMessages.filter((message) => message.type === "track:update");
  const telemetryMessages = sentMessages.filter((message) => message.type === "telemetry:update");
  const weatherMessages = sentMessages.filter((message) => message.type === "weather:update");
  const raceControlMessages = sentMessages.filter((message) => message.type === "race-control:update");

  const latestTrackX = trackMessages[0]?.payload.positions[0]?.x;
  const latestTelemetrySpeed = telemetryMessages[0]?.payload.snapshots[0]?.speed;

  scheduler.stop();

  if (
    trackMessages.length !== 1 ||
    telemetryMessages.length !== 1 ||
    weatherMessages.length !== 1 ||
    raceControlMessages.length !== 1 ||
    latestTrackX !== 2 ||
    latestTelemetrySpeed !== 202
  ) {
    throw new Error("Dashboard message throttling/batching behavior did not match expectations.");
  }
}

function createTrackMessage(x: number): DashboardMessage {
  return {
    type: "track:update",
    sentAt: receivedAt.toISOString(),
    payload: {
      positions: [
        {
          abbreviation: "1",
          x,
          y: 10,
          z: 0,
          updatedAt: receivedAt.toISOString()
        }
      ]
    }
  };
}

function createTelemetryMessage(speed: number): DashboardMessage {
  return {
    type: "telemetry:update",
    sentAt: receivedAt.toISOString(),
    payload: {
      snapshots: [
        {
          driverNumber: 1,
          speed,
          throttle: 90,
          brake: 0,
          gear: 7,
          rpm: 11_100,
          updatedAt: receivedAt.toISOString()
        }
      ]
    }
  };
}

function createWeatherMessage(): DashboardMessage {
  return {
    type: "weather:update",
    sentAt: receivedAt.toISOString(),
    payload: {
      airTemperature: 21,
      trackTemperature: 32,
      humidity: 50,
      rainfall: 0,
      windSpeed: 5,
      windDirection: 180,
      updatedAt: receivedAt.toISOString()
    }
  };
}

function createRaceControlMessage(): DashboardMessage {
  return {
    type: "race-control:update",
    sentAt: receivedAt.toISOString(),
    payload: {
      messages: [
        {
          id: "race-control-probe",
          category: "flag",
          message: "GREEN FLAG",
          receivedAt: receivedAt.toISOString()
        }
      ]
    }
  };
}

async function delay(ms: number): Promise<void> {
  await new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}
