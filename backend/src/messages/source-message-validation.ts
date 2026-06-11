import {
  MOCK_SOURCE_MESSAGE_TYPES,
  type MockSourceMessage,
  type MockTyreCompound
} from "./source-message-types.js";

export type SourceMessageValidationResult =
  | {
      readonly valid: true;
      readonly message: MockSourceMessage;
    }
  | {
      readonly valid: false;
      readonly reason: string;
    };

export function validateSourceMessage(message: unknown): SourceMessageValidationResult {
  if (!isRecord(message)) {
    return invalid("message must be an object");
  }

  if (!isKnownSourceType(message.type)) {
    return invalid("message type is missing or unsupported");
  }

  if (!isIsoDateString(message.recordedAt)) {
    return invalid(`${message.type} recordedAt must be a valid ISO date string`);
  }

  if (!isRecord(message.payload)) {
    return invalid(`${message.type} payload must be an object`);
  }

  switch (message.type) {
    case "mock:connection":
      return validateConnectionMessage(message);
    case "mock:timing":
      return validateTimingMessage(message);
    case "mock:race-control":
      return validateRaceControlMessage(message);
    case "mock:location":
      return validateLocationMessage(message);
    case "mock:weather":
      return validateWeatherMessage(message);
    case "mock:telemetry":
      return validateTelemetryMessage(message);
    case "mock:tyre-stint":
      return validateTyreStintMessage(message);
  }
}

function validateConnectionMessage(message: Record<string, unknown>): SourceMessageValidationResult {
  const payload = message.payload;

  if (!isRecord(payload) || !isString(payload.sessionName) || payload.sessionType !== "Race") {
    return invalid("mock:connection payload must include sessionName and sessionType");
  }

  return valid(message as MockSourceMessage);
}

function validateTimingMessage(message: Record<string, unknown>): SourceMessageValidationResult {
  const payload = message.payload;

  if (!isRecord(payload) || !isNumber(payload.lap) || !Array.isArray(payload.drivers)) {
    return invalid("mock:timing payload must include lap and drivers");
  }

  const driversAreValid = payload.drivers.every(
    (driver) =>
      isRecord(driver) &&
      isNumber(driver.position) &&
      isString(driver.abbreviation) &&
      isString(driver.gapToLeader)
  );

  return driversAreValid ? valid(message as MockSourceMessage) : invalid("mock:timing drivers are malformed");
}

function validateRaceControlMessage(message: Record<string, unknown>): SourceMessageValidationResult {
  const payload = message.payload;

  if (!isRecord(payload) || !Array.isArray(payload.messages)) {
    return invalid("mock:race-control payload must include messages");
  }

  const messagesAreValid = payload.messages.every(
    (raceControlMessage) =>
      isRecord(raceControlMessage) &&
      isString(raceControlMessage.id) &&
      (raceControlMessage.category === "session" || raceControlMessage.category === "flag") &&
      isString(raceControlMessage.message)
  );

  return messagesAreValid
    ? valid(message as MockSourceMessage)
    : invalid("mock:race-control messages are malformed");
}

function validateLocationMessage(message: Record<string, unknown>): SourceMessageValidationResult {
  const payload = message.payload;

  if (!isRecord(payload) || !Array.isArray(payload.positions)) {
    return invalid("mock:location payload must include positions");
  }

  const positionsAreValid = payload.positions.every(
    (position) =>
      isRecord(position) &&
      isString(position.abbreviation) &&
      isNumber(position.x) &&
      isNumber(position.y) &&
      isNumber(position.z)
  );

  return positionsAreValid ? valid(message as MockSourceMessage) : invalid("mock:location positions are malformed");
}

function validateWeatherMessage(message: Record<string, unknown>): SourceMessageValidationResult {
  const payload = message.payload;

  if (
    !isRecord(payload) ||
    !isNumber(payload.airTemperature) ||
    !isNumber(payload.trackTemperature) ||
    !isNumber(payload.humidity) ||
    !isNumber(payload.rainfall) ||
    !isNumber(payload.windSpeed) ||
    !isNumber(payload.windDirection)
  ) {
    return invalid("mock:weather payload is malformed");
  }

  return valid(message as MockSourceMessage);
}

function validateTelemetryMessage(message: Record<string, unknown>): SourceMessageValidationResult {
  const payload = message.payload;

  if (!isRecord(payload) || !Array.isArray(payload.snapshots)) {
    return invalid("mock:telemetry payload must include snapshots");
  }

  const snapshotsAreValid = payload.snapshots.every(
    (snapshot) =>
      isRecord(snapshot) &&
      isNumber(snapshot.driverNumber) &&
      isNumber(snapshot.speed) &&
      isNumber(snapshot.throttle) &&
      isNumber(snapshot.brake) &&
      isNumber(snapshot.gear) &&
      isNumber(snapshot.rpm)
  );

  return snapshotsAreValid
    ? valid(message as MockSourceMessage)
    : invalid("mock:telemetry snapshots are malformed");
}

function validateTyreStintMessage(message: Record<string, unknown>): SourceMessageValidationResult {
  const payload = message.payload;

  if (!isRecord(payload) || !Array.isArray(payload.stints)) {
    return invalid("mock:tyre-stint payload must include stints");
  }

  const stintsAreValid = payload.stints.every(
    (stint) =>
      isRecord(stint) &&
      isNumber(stint.driverNumber) &&
      isMockTyreCompound(stint.compound) &&
      isNumber(stint.stintNumber) &&
      isNumber(stint.stintAgeLaps) &&
      isNumber(stint.pitStops)
  );

  return stintsAreValid ? valid(message as MockSourceMessage) : invalid("mock:tyre-stint stints are malformed");
}

function valid(message: MockSourceMessage): SourceMessageValidationResult {
  return {
    valid: true,
    message
  };
}

function invalid(reason: string): SourceMessageValidationResult {
  return {
    valid: false,
    reason
  };
}

function isKnownSourceType(value: unknown): value is MockSourceMessage["type"] {
  return isString(value) && MOCK_SOURCE_MESSAGE_TYPES.includes(value as MockSourceMessage["type"]);
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

function isIsoDateString(value: unknown): value is string {
  return isString(value) && !Number.isNaN(Date.parse(value));
}

function isMockTyreCompound(value: unknown): value is MockTyreCompound {
  return value === "soft" || value === "medium" || value === "hard";
}
