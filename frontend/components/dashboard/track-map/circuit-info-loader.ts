import type { CircuitInfo, CircuitTrackMarker } from "./circuit-info-types";

export async function loadCircuitInfo(circuitInfoUrl: string, signal: AbortSignal): Promise<CircuitInfo> {
  const response = await fetch(circuitInfoUrl, {
    signal,
    headers: {
      accept: "application/json"
    }
  });

  if (!response.ok) {
    throw new Error(`Circuit info request failed with status ${response.status}.`);
  }

  return parseCircuitInfo(await response.json());
}

export function parseCircuitInfo(value: unknown): CircuitInfo {
  if (!isRecord(value)) {
    throw new Error("Circuit info must be an object.");
  }

  const x = readNumberArray(value.x);
  const y = readNumberArray(value.y);

  if (x.length < 2 || y.length < 2 || x.length !== y.length) {
    throw new Error("Circuit info must include matching x and y coordinate arrays.");
  }

  return {
    x,
    y,
    rotation: readOptionalNumber(value.rotation),
    circuitName: readOptionalString(value.circuitName),
    meetingName: readOptionalString(value.meetingName),
    corners: readMarkerArray(value.corners),
    marshalSectors: readMarkerArray(value.marshalSectors),
    marshalLights: readMarkerArray(value.marshalLights)
  };
}

function readNumberArray(value: unknown): readonly number[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(isNumber);
}

function readMarkerArray(value: unknown): readonly CircuitTrackMarker[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map(readMarker)
    .filter((marker): marker is CircuitTrackMarker => marker !== null);
}

function readMarker(value: unknown): CircuitTrackMarker | null {
  if (!isRecord(value) || !isNumber(value.number) || !isRecord(value.trackPosition)) {
    return null;
  }

  const x = value.trackPosition.x;
  const y = value.trackPosition.y;

  if (!isNumber(x) || !isNumber(y)) {
    return null;
  }

  return {
    number: value.number,
    trackPosition: {
      x,
      y
    }
  };
}

function readOptionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function readOptionalNumber(value: unknown): number | undefined {
  return isNumber(value) ? value : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}
