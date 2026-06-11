import type { DashboardMessage } from "../state/types.js";

export type DashboardMessageScheduler = {
  readonly schedule: (message: DashboardMessage) => void;
  readonly flush: () => void;
  readonly stop: () => void;
};

export type DashboardMessageSchedulerOptions = {
  readonly throttleIntervalMs?: number;
};

const DEFAULT_THROTTLE_INTERVAL_MS = 250;
const THROTTLED_MESSAGE_TYPES = new Set<DashboardMessage["type"]>(["track:update", "telemetry:update"]);

export function createDashboardMessageScheduler(
  send: (message: DashboardMessage) => void,
  options: DashboardMessageSchedulerOptions = {}
): DashboardMessageScheduler {
  const throttleIntervalMs = options.throttleIntervalMs ?? DEFAULT_THROTTLE_INTERVAL_MS;
  const pendingMessages = new Map<DashboardMessage["type"], DashboardMessage>();
  const timers = new Map<DashboardMessage["type"], NodeJS.Timeout>();

  const flushMessageType = (type: DashboardMessage["type"]) => {
    const message = pendingMessages.get(type);

    if (!message) {
      timers.delete(type);
      return;
    }

    pendingMessages.delete(type);
    timers.delete(type);
    send(message);
  };

  return {
    schedule(message): void {
      if (!THROTTLED_MESSAGE_TYPES.has(message.type)) {
        send(message);
        return;
      }

      pendingMessages.set(message.type, message);

      if (timers.has(message.type)) {
        return;
      }

      timers.set(
        message.type,
        setTimeout(() => {
          flushMessageType(message.type);
        }, throttleIntervalMs)
      );
    },

    flush(): void {
      for (const timer of timers.values()) {
        clearTimeout(timer);
      }

      for (const type of pendingMessages.keys()) {
        const message = pendingMessages.get(type);

        if (message) {
          send(message);
        }
      }

      timers.clear();
      pendingMessages.clear();
    },

    stop(): void {
      for (const timer of timers.values()) {
        clearTimeout(timer);
      }

      timers.clear();
      pendingMessages.clear();
    }
  };
}
