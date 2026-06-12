import {
  SOURCE_MESSAGE_TYPES,
  type MockTyreCompound,
  type SourceMessage
} from "./source-message-types.js";

export type SourceMessageValidationResult =
  | {
      readonly valid: true;
      readonly message: SourceMessage;
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
    case "openf1:meeting":
      return validateOpenF1MeetingMessage(message);
    case "openf1:session":
      return validateOpenF1SessionMessage(message);
    case "openf1:drivers":
      return validateOpenF1DriversMessage(message);
    case "openf1:position":
      return validateOpenF1PositionMessage(message);
    case "openf1:timing":
      return validateOpenF1TimingMessage(message);
    case "openf1:location":
      return validateLocationMessage(message);
    case "openf1:race-control":
      return validateOpenF1RaceControlMessage(message);
    case "openf1:telemetry":
      return validateTelemetryMessage(message);
    case "openf1:pit":
    case "openf1:tyre-stint":
      return validateTyreStintMessage(message);
    case "openf1:weather":
      return validateWeatherMessage(message);
  }
}

function validateOpenF1MeetingMessage(message: Record<string, unknown>): SourceMessageValidationResult {
  const payload = message.payload;

  if (!isRecord(payload) || !isNumber(payload.meetingKey) || !isString(payload.meetingName)) {
    return invalid("openf1:meeting payload must include meetingKey and meetingName");
  }

  return valid(message as SourceMessage);
}

function validateOpenF1SessionMessage(message: Record<string, unknown>): SourceMessageValidationResult {
  const payload = message.payload;

  if (
    !isRecord(payload) ||
    !isString(payload.sessionName) ||
    !optionalNumber(payload.meetingKey) ||
    !optionalNumber(payload.sessionKey) ||
    !optionalString(payload.dateStart) ||
    !optionalString(payload.dateEnd) ||
    !isOpenF1SessionType(payload.sessionType)
  ) {
    return invalid("openf1:session payload must include sessionName and supported sessionType");
  }

  return valid(message as SourceMessage);
}

function validateConnectionMessage(message: Record<string, unknown>): SourceMessageValidationResult {
  const payload = message.payload;

  if (!isRecord(payload) || !isString(payload.sessionName) || payload.sessionType !== "Race") {
    return invalid("mock:connection payload must include sessionName and sessionType");
  }

  return valid(message as SourceMessage);
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
      isString(driver.gapToLeader) &&
      optionalString(driver.intervalToAhead) &&
      optionalString(driver.latestInterval)
  );

  return driversAreValid ? valid(message as SourceMessage) : invalid("mock:timing drivers are malformed");
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
    ? valid(message as SourceMessage)
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

  return positionsAreValid ? valid(message as SourceMessage) : invalid("mock:location positions are malformed");
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

  return valid(message as SourceMessage);
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
    ? valid(message as SourceMessage)
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

  return stintsAreValid ? valid(message as SourceMessage) : invalid("mock:tyre-stint stints are malformed");
}

function validateOpenF1DriversMessage(message: Record<string, unknown>): SourceMessageValidationResult {
  const payload = message.payload;

  if (!isRecord(payload) || !Array.isArray(payload.drivers)) {
    return invalid("openf1:drivers payload must include drivers");
  }

  const driversAreValid = payload.drivers.every(
    (driver) =>
      isRecord(driver) &&
      isNumber(driver.driverNumber) &&
      isString(driver.abbreviation) &&
      optionalString(driver.fullName) &&
      optionalString(driver.teamName)
  );

  return driversAreValid ? valid(message as SourceMessage) : invalid("openf1:drivers drivers are malformed");
}

function validateOpenF1PositionMessage(message: Record<string, unknown>): SourceMessageValidationResult {
  const payload = message.payload;

  if (!isRecord(payload) || !Array.isArray(payload.positions)) {
    return invalid("openf1:position payload must include positions");
  }

  const positionsAreValid = payload.positions.every(
    (position) =>
      isRecord(position) &&
      isNumber(position.driverNumber) &&
      isNumber(position.position) &&
      optionalString(position.updatedAt)
  );

  return positionsAreValid ? valid(message as SourceMessage) : invalid("openf1:position positions are malformed");
}

function validateOpenF1TimingMessage(message: Record<string, unknown>): SourceMessageValidationResult {
  const payload = message.payload;

  if (!isRecord(payload) || !optionalNumber(payload.lap) || !Array.isArray(payload.drivers)) {
    return invalid("openf1:timing payload must include lap and drivers");
  }

  const driversAreValid = payload.drivers.every(
    (driver) =>
      isRecord(driver) &&
      isNumber(driver.driverNumber) &&
      optionalNumber(driver.position) &&
      optionalString(driver.gapToLeader) &&
      optionalString(driver.intervalToAhead) &&
      optionalString(driver.intervalUpdatedAt) &&
      optionalNumber(driver.lapDuration) &&
      optionalNumber(driver.lapNumber) &&
      optionalString(driver.lapUpdatedAt) &&
      optionalString(driver.lastLapTime) &&
      optionalString(driver.bestLapTime)
  );

  return driversAreValid ? valid(message as SourceMessage) : invalid("openf1:timing drivers are malformed");
}

function validateOpenF1RaceControlMessage(message: Record<string, unknown>): SourceMessageValidationResult {
  const payload = message.payload;

  if (!isRecord(payload) || !Array.isArray(payload.messages)) {
    return invalid("openf1:race-control payload must include messages");
  }

  const messagesAreValid = payload.messages.every(
    (raceControlMessage) =>
      isRecord(raceControlMessage) &&
      isString(raceControlMessage.id) &&
      (raceControlMessage.category === "session" || raceControlMessage.category === "flag") &&
      isString(raceControlMessage.message)
  );

  return messagesAreValid
    ? valid(message as SourceMessage)
    : invalid("openf1:race-control messages are malformed");
}

function valid(message: SourceMessage): SourceMessageValidationResult {
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

function isKnownSourceType(value: unknown): value is SourceMessage["type"] {
  return isString(value) && SOURCE_MESSAGE_TYPES.includes(value as SourceMessage["type"]);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function optionalString(value: unknown): boolean {
  return value === undefined || typeof value === "string";
}

function optionalNumber(value: unknown): boolean {
  return value === null || value === undefined || isNumber(value);
}

function isOpenF1SessionType(value: unknown): boolean {
  return (
    value === "Race" ||
    value === "Qualifying" ||
    value === "Practice" ||
    value === "Sprint" ||
    value === "Sprint Qualifying"
  );
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
