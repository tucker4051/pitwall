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
    case "v1/sessions":
      return mapSessionMessage(topic, payload, receivedAt);
    case "v1/drivers":
      return mapDriverMessage(topic, payload, receivedAt);
    case "v1/position":
      return mapPositionMessage(topic, payload, receivedAt);
    case "v1/intervals":
      return mapIntervalMessage(topic, payload, receivedAt);
    case "v1/laps":
      return mapLapMessage(topic, payload, receivedAt);
    case "v1/location":
      return mapLocationMessage(topic, payload, receivedAt);
    case "v1/race_control":
      return mapRaceControlMessage(topic, payload, receivedAt);
    case "v1/stints":
      return mapStintMessage(topic, payload, receivedAt);
    case "v1/pit":
      return mapPitMessage(topic, payload, receivedAt);
    case "v1/weather":
      return mapWeatherMessage(topic, payload, receivedAt);
    case "v1/car_data":
      return mapCarDataMessage(topic, payload, receivedAt);
  }
}

function mapSessionMessage(
  topic: "v1/sessions",
  payload: Record<string, unknown>,
  receivedAt: Date
): OpenF1MappingResult {
  const sessionType = normalizeSessionType(payload.session_type);

  if (!isString(payload.session_name) || !sessionType) {
    return {
      mapped: false,
      reason: "malformed-payload"
    };
  }

  const recordedAt = receivedAt.toISOString();

  return {
    mapped: true,
    message: {
      type: "openf1:session",
      recordedAt,
      metadata: createMetadata(topic, payload, recordedAt),
      payload: {
        meetingKey: readNumber(payload.meeting_key),
        sessionKey: readNumber(payload.session_key),
        sessionName: payload.session_name,
        sessionType,
        dateStart: readOptionalString(payload.date_start),
        dateEnd: readOptionalString(payload.date_end)
      }
    }
  };
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
            nameAcronym: payload.name_acronym,
            abbreviation: payload.name_acronym,
            broadcastName: readOptionalString(payload.broadcast_name),
            fullName: readOptionalString(payload.full_name),
            teamName: readOptionalString(payload.team_name),
            teamColour: readOptionalString(payload.team_colour),
            headshotUrl: readOptionalString(payload.headshot_url)
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
            position: payload.position,
            updatedAt: readOptionalString(payload.date) ?? recordedAt
          }
        ]
      }
    }
  };
}

function mapLapMessage(
  topic: "v1/laps",
  payload: Record<string, unknown>,
  receivedAt: Date
): OpenF1MappingResult {
  if (!isNumber(payload.driver_number) || !isNumber(payload.lap_number)) {
    return {
      mapped: false,
      reason: "malformed-payload"
    };
  }

  const recordedAt = receivedAt.toISOString();

  return {
    mapped: true,
    message: {
      type: "openf1:timing",
      recordedAt,
      metadata: createMetadata(topic, payload, recordedAt),
      payload: {
        lap: payload.lap_number,
        drivers: [
          {
            driverNumber: payload.driver_number,
            lapDuration: readNumber(payload.lap_duration),
            lapNumber: payload.lap_number,
            lapUpdatedAt: readOptionalString(payload.date_start) ?? recordedAt,
            lastLapTime: formatDuration(payload.lap_duration)
          }
        ]
      }
    }
  };
}

function mapIntervalMessage(
  topic: "v1/intervals",
  payload: Record<string, unknown>,
  receivedAt: Date
): OpenF1MappingResult {
  if (!isNumber(payload.driver_number)) {
    return {
      mapped: false,
      reason: "malformed-payload"
    };
  }

  const recordedAt = receivedAt.toISOString();

  return {
    mapped: true,
    message: {
      type: "openf1:timing",
      recordedAt,
      metadata: createMetadata(topic, payload, recordedAt),
      payload: {
        lap: null,
        drivers: [
          {
            driverNumber: payload.driver_number,
            gapToLeader: formatInterval(payload.gap_to_leader),
            intervalToAhead: formatInterval(payload.interval),
            intervalUpdatedAt: readOptionalString(payload.date) ?? recordedAt
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

function mapLocationMessage(
  topic: "v1/location",
  payload: Record<string, unknown>,
  receivedAt: Date
): OpenF1MappingResult {
  if (
    !isNumber(payload.driver_number) ||
    !isNumber(payload.x) ||
    !isNumber(payload.y) ||
    !isNumber(payload.z)
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
      type: "openf1:location",
      recordedAt,
      metadata: createMetadata(topic, payload, recordedAt),
      payload: {
        positions: [
          {
            abbreviation: String(payload.driver_number),
            x: payload.x,
            y: payload.y,
            z: payload.z
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

function mapCarDataMessage(
  topic: "v1/car_data",
  payload: Record<string, unknown>,
  receivedAt: Date
): OpenF1MappingResult {
  if (
    !isNumber(payload.driver_number) ||
    !isNumber(payload.speed) ||
    !isNumber(payload.throttle) ||
    !isNumber(payload.brake) ||
    !isNumber(payload.n_gear) ||
    !isNumber(payload.rpm)
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
      type: "openf1:telemetry",
      recordedAt,
      metadata: createMetadata(topic, payload, recordedAt),
      payload: {
        snapshots: [
          {
            driverNumber: payload.driver_number,
            speed: payload.speed,
            throttle: payload.throttle,
            brake: payload.brake,
            gear: payload.n_gear,
            rpm: payload.rpm
          }
        ]
      }
    }
  };
}

function mapStintMessage(
  topic: "v1/stints",
  payload: Record<string, unknown>,
  receivedAt: Date
): OpenF1MappingResult {
  const compound = normalizeCompound(payload.compound);

  if (
    !isNumber(payload.driver_number) ||
    !isNumber(payload.stint_number) ||
    !isNumber(payload.tyre_age_at_start) ||
    !compound
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
      type: "openf1:tyre-stint",
      recordedAt,
      metadata: createMetadata(topic, payload, recordedAt),
      payload: {
        stints: [
          {
            driverNumber: payload.driver_number,
            compound,
            stintNumber: payload.stint_number,
            stintAgeLaps: payload.tyre_age_at_start,
            pitStops: Math.max(0, payload.stint_number - 1)
          }
        ]
      }
    }
  };
}

function mapPitMessage(
  topic: "v1/pit",
  payload: Record<string, unknown>,
  receivedAt: Date
): OpenF1MappingResult {
  if (!isNumber(payload.driver_number) || !isNumber(payload.lap_number)) {
    return {
      mapped: false,
      reason: "malformed-payload"
    };
  }

  const recordedAt = receivedAt.toISOString();

  return {
    mapped: true,
    message: {
      type: "openf1:pit",
      recordedAt,
      metadata: createMetadata(topic, payload, recordedAt),
      payload: {
        stints: [
          {
            driverNumber: payload.driver_number,
            compound: "medium",
            stintNumber: 1,
            stintAgeLaps: payload.lap_number,
            pitStops: 1
          }
        ]
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
    meetingKey: readMeetingKey(payload),
    sessionKey: readSessionKey(payload),
    receivedAt
  };
}

function readOpenF1Id(payload: Record<string, unknown>): string | number | undefined {
  return isString(payload._id) || isNumber(payload._id) ? payload._id : undefined;
}

function readMessageIdentity(payload: Record<string, unknown>): string | undefined {
  const key = readOptionalString(payload._key);

  if (key) {
    return key;
  }

  const id = readOpenF1Id(payload);
  return id === undefined ? undefined : String(id);
}

function readSessionKey(payload: Record<string, unknown>): string | number | undefined {
  return isString(payload.session_key) || isNumber(payload.session_key) ? payload.session_key : undefined;
}

function readMeetingKey(payload: Record<string, unknown>): string | number | undefined {
  return isString(payload.meeting_key) || isNumber(payload.meeting_key) ? payload.meeting_key : undefined;
}

function readNumber(value: unknown): number | undefined {
  return isNumber(value) ? value : undefined;
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

function normalizeCompound(value: unknown): "soft" | "medium" | "hard" | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.toLowerCase();

  if (normalized === "soft" || normalized === "medium" || normalized === "hard") {
    return normalized;
  }

  return undefined;
}

function normalizeSessionType(
  value: unknown
): "Race" | "Qualifying" | "Practice" | "Sprint" | "Sprint Qualifying" | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.toLowerCase();

  if (normalized.includes("sprint shootout") || normalized.includes("sprint qualifying")) {
    return "Sprint Qualifying";
  }

  if (normalized.includes("sprint") && normalized.includes("race")) {
    return "Sprint";
  }

  if (normalized === "sprint") {
    return "Sprint";
  }

  if (normalized.includes("race")) {
    return "Race";
  }

  if (normalized.includes("qualifying")) {
    return "Qualifying";
  }

  if (normalized.includes("practice")) {
    return "Practice";
  }

  return undefined;
}

function formatDuration(value: unknown): string | undefined {
  if (!isNumber(value) || value <= 0) {
    return undefined;
  }

  return value.toFixed(3);
}

function formatInterval(value: unknown): string | undefined {
  if (typeof value === "string" && value.length > 0) {
    return value;
  }

  if (!isNumber(value)) {
    return undefined;
  }

  return value === 0 ? "LEADER" : `+${value.toFixed(3)}`;
}
