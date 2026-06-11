import type { SourceMessage, SourceMessageMetadata } from "../messages/source-message-types.js";
import { isOpenF1MappedTopic, type OpenF1MappedTopic } from "./openf1-message-types.js";

export type OpenF1MappingResult =
  | {
      readonly mapped: true;
      readonly message: SourceMessage;
    }
  | {
      readonly mapped: false;
      readonly reason: "unsupported-topic" | "malformed-payload";
    };

export function mapOpenF1Message(topic: string, payload: unknown, receivedAt = new Date()): OpenF1MappingResult {
  if (!isOpenF1MappedTopic(topic)) {
    return {
      mapped: false,
      reason: "unsupported-topic"
    };
  }

  if (!isRecord(payload)) {
    return {
      mapped: false,
      reason: "malformed-payload"
    };
  }

  switch (topic) {
    case "v1/drivers":
      return mapDriverMessage(topic, payload, receivedAt);
    case "v1/position":
      return mapPositionMessage(topic, payload, receivedAt);
    case "v1/race_control":
      return mapRaceControlMessage(topic, payload, receivedAt);
    case "v1/weather":
      return mapWeatherMessage(topic, payload, receivedAt);
  }
}

function mapDriverMessage(
  topic: "v1/drivers",
  payload: Record<string, unknown>,
  receivedAt: Date
): OpenF1MappingResult {
  if (!isNumber(payload.driver_number) || !isString(payload.name_acronym)) {
    return {
      mapped: false,
      reason: "malformed-payload"
    };
  }

  const recordedAt = receivedAt.toISOString();

  return {
    mapped: true,
    message: {
      type: "openf1:drivers",
      recordedAt,
      metadata: createMetadata(topic, payload, recordedAt),
      payload: {
        drivers: [
          {
            driverNumber: payload.driver_number,
            abbreviation: payload.name_acronym,
            fullName: readOptionalString(payload.full_name),
            teamName: readOptionalString(payload.team_name)
          }
        ]
      }
    }
  };
}

function mapPositionMessage(
  topic: "v1/position",
  payload: Record<string, unknown>,
  receivedAt: Date
): OpenF1MappingResult {
  if (!isNumber(payload.driver_number) || !isNumber(payload.position)) {
    return {
      mapped: false,
      reason: "malformed-payload"
    };
  }

  const recordedAt = receivedAt.toISOString();

  return {
    mapped: true,
    message: {
      type: "openf1:position",
      recordedAt,
      metadata: createMetadata(topic, payload, recordedAt),
      payload: {
        positions: [
          {
            driverNumber: payload.driver_number,
            position: payload.position
          }
        ]
      }
    }
  };
}

function mapRaceControlMessage(
  topic: "v1/race_control",
  payload: Record<string, unknown>,
  receivedAt: Date
): OpenF1MappingResult {
  if (!isString(payload.message)) {
    return {
      mapped: false,
      reason: "malformed-payload"
    };
  }

  const recordedAt = receivedAt.toISOString();
  const category = payload.category === "Flag" || payload.flag ? "flag" : "session";

  return {
    mapped: true,
    message: {
      type: "openf1:race-control",
      recordedAt,
      metadata: createMetadata(topic, payload, recordedAt),
      payload: {
        messages: [
          {
            id: readMessageIdentity(payload) ?? `openf1-race-control-${recordedAt}`,
            category,
            message: payload.message
          }
        ]
      }
    }
  };
}

function mapWeatherMessage(
  topic: "v1/weather",
  payload: Record<string, unknown>,
  receivedAt: Date
): OpenF1MappingResult {
  if (
    !isNumber(payload.air_temperature) ||
    !isNumber(payload.track_temperature) ||
    !isNumber(payload.humidity) ||
    !isNumber(payload.rainfall) ||
    !isNumber(payload.wind_speed) ||
    !isNumber(payload.wind_direction)
  ) {
    return {
      mapped: false,
      reason: "malformed-payload"
    };
  }

  const recordedAt = receivedAt.toISOString();

  return {
    mapped: true,
    message: {
      type: "openf1:weather",
      recordedAt,
      metadata: createMetadata(topic, payload, recordedAt),
      payload: {
        airTemperature: payload.air_temperature,
        trackTemperature: payload.track_temperature,
        humidity: payload.humidity,
        rainfall: payload.rainfall,
        windSpeed: payload.wind_speed,
        windDirection: payload.wind_direction
      }
    }
  };
}

function createMetadata<TTopic extends OpenF1MappedTopic>(
  topic: TTopic,
  payload: Record<string, unknown>,
  receivedAt: string
): SourceMessageMetadata & { readonly source: "openf1"; readonly topic: TTopic } {
  return {
    source: "openf1",
    topic,
    openF1Id: readOpenF1Id(payload),
    openF1Key: readOptionalString(payload._key),
    receivedAt
  };
}

function readOpenF1Id(payload: Record<string, unknown>): string | number | undefined {
  return isString(payload._id) || isNumber(payload._id) ? payload._id : undefined;
}

function readMessageIdentity(payload: Record<string, unknown>): string | undefined {
  const id = readOpenF1Id(payload);
  return id === undefined ? undefined : String(id);
}

function readOptionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function isNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}
