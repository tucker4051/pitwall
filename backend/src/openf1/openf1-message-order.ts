export type OpenF1MessageOrderResult =
  | {
      readonly accepted: true;
      readonly id: number | null;
    }
  | {
      readonly accepted: false;
      readonly id: number;
      readonly lastProcessedId: number;
      readonly reason: "older-or-duplicate-id";
    };

export type OpenF1MessageOrderTracker = {
  readonly shouldProcess: (topic: string, payload: unknown) => OpenF1MessageOrderResult;
};

export function createOpenF1MessageOrderTracker(): OpenF1MessageOrderTracker {
  const lastProcessedIds = new Map<string, number>();

  return {
    shouldProcess(topic, payload): OpenF1MessageOrderResult {
      const id = readOpenF1Id(payload);

      if (id === null) {
        return {
          accepted: true,
          id
        };
      }

      const lastProcessedId = lastProcessedIds.get(topic);

      if (lastProcessedId !== undefined && id <= lastProcessedId) {
        return {
          accepted: false,
          id,
          lastProcessedId,
          reason: "older-or-duplicate-id"
        };
      }

      lastProcessedIds.set(topic, id);

      return {
        accepted: true,
        id
      };
    }
  };
}

function readOpenF1Id(payload: unknown): number | null {
  if (!isRecord(payload)) {
    return null;
  }

  if (typeof payload._id === "number" && Number.isFinite(payload._id)) {
    return payload._id;
  }

  if (typeof payload._id !== "string") {
    return null;
  }

  const parsed = Number(payload._id);
  return Number.isFinite(parsed) ? parsed : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
