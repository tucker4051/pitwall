import { getDriverIdentity } from "../driver-identity";
import { getTeamColourProfile } from "../team-colours";
import type { TimingDriver, TrackPosition } from "../types";
import type { CircuitInfo, CircuitTrackPoint } from "./circuit-info-types";
import { combineCoordinateArrays, normaliseTrackPointsToReference } from "./normalise-track-points";

type DriverMarkerLayerProps = {
  readonly circuitInfo: CircuitInfo;
  readonly positions: readonly TrackPosition[];
  readonly drivers: readonly TimingDriver[];
  readonly selectedDriverNumber?: number;
};

type DriverMarker = {
  readonly key: string;
  readonly x: number;
  readonly y: number;
  readonly colour: string;
  readonly outlineColour: string;
  readonly isSelected: boolean;
  readonly selectedLabel: string | null;
};

const FALLBACK_MARKER_COLOUR = "#64748b";

export function DriverMarkerLayer({
  circuitInfo,
  positions,
  drivers,
  selectedDriverNumber
}: DriverMarkerLayerProps) {
  const markers = buildDriverMarkers(circuitInfo, positions, drivers, selectedDriverNumber);

  if (markers.length === 0) {
    return null;
  }

  return (
    <svg
      className="h-full w-full pointer-events-none"
      viewBox="0 0 100 100"
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
    >
      {markers.map((marker) => (
        <g key={marker.key} transform={`translate(${marker.x} ${marker.y})`}>
          {marker.isSelected ? (
            <>
              <circle r="3.25" fill="none" stroke="#22d3ee" strokeOpacity="0.38" strokeWidth="1.35" />
              <circle r="2.25" fill={marker.colour} stroke="#67e8f9" strokeWidth="0.75" />
            </>
          ) : (
            <circle r="1.35" fill={marker.colour} stroke={marker.outlineColour} strokeOpacity="0.95" strokeWidth="0.45" />
          )}
          {marker.isSelected && marker.selectedLabel ? (
            <g transform="translate(3.5 -2.2)">
              <rect x="-0.8" y="-2.9" width="8.1" height="4.3" fill="#05070b" fillOpacity="0.86" stroke="#22d3ee" strokeOpacity="0.45" strokeWidth="0.25" />
              <text
                x="0"
                y="0.15"
                fill="#cffafe"
                fontFamily="var(--font-geist-mono), monospace"
                fontSize="2.8"
                fontWeight="800"
                paintOrder="stroke"
                stroke="#05070b"
                strokeWidth="0.45"
              >
                {marker.selectedLabel}
              </text>
            </g>
          ) : null}
        </g>
      ))}
    </svg>
  );
}

function buildDriverMarkers(
  circuitInfo: CircuitInfo,
  positions: readonly TrackPosition[],
  drivers: readonly TimingDriver[],
  selectedDriverNumber: number | undefined
): readonly DriverMarker[] {
  const circuitPoints = combineCoordinateArrays(circuitInfo.x, circuitInfo.y);
  const markerInputs = positions
    .map((position) => {
      const driver = findDriverForTrackPosition(position, drivers);

      if (!driver) {
        return null;
      }

      return {
        position,
        driver,
        point: {
          x: position.x,
          y: position.y
        }
      };
    })
    .filter(
      (entry): entry is {
        readonly position: TrackPosition;
        readonly driver: TimingDriver;
        readonly point: CircuitTrackPoint;
      } => entry !== null
    );

  const normalisedPoints = normaliseTrackPointsToReference(
    markerInputs.map((entry) => entry.point),
    circuitPoints
  );

  return markerInputs
    .map((entry, index) => {
      const point = normalisedPoints[index];

      if (!point) {
        return null;
      }

      const teamProfile = getTeamColourProfile(entry.driver.teamName);
      const markerColour = resolveMarkerColour(entry.driver.teamColour, teamProfile.primary);
      const isSelected = Boolean(selectedDriverNumber && entry.driver.driverNumber === selectedDriverNumber);

      return {
        key: entry.driver.driverNumber ? `driver-${entry.driver.driverNumber}` : `position-${entry.position.abbreviation}`,
        x: point.x,
        y: point.y,
        colour: markerColour,
        outlineColour: teamProfile.isLightPrimary ? "#020617" : "#e2e8f0",
        isSelected,
        selectedLabel: isSelected ? getSelectedDriverAcronym(entry.driver) : null
      };
    })
    .filter((marker): marker is DriverMarker => marker !== null);
}

function findDriverForTrackPosition(position: TrackPosition, drivers: readonly TimingDriver[]): TimingDriver | undefined {
  if (position.driverNumber !== undefined) {
    return drivers.find((driver) => driver.driverNumber === position.driverNumber);
  }

  const driverNumber = Number(position.abbreviation);

  if (Number.isFinite(driverNumber)) {
    return drivers.find((driver) => driver.driverNumber === driverNumber);
  }

  return drivers.find((driver) => driver.abbreviation === position.abbreviation || driver.nameAcronym === position.abbreviation);
}

function getSelectedDriverAcronym(driver: TimingDriver): string | null {
  const identity = getDriverIdentity(driver);
  const acronym = driver.nameAcronym ?? identity.displayAcronym;

  return /^\d+$/.test(acronym) ? null : acronym;
}

function normaliseHexColour(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  const trimmed = value.trim().replace(/^#/, "");

  if (/^[0-9a-f]{3}$/i.test(trimmed)) {
    return `#${trimmed
      .split("")
      .map((character) => `${character}${character}`)
      .join("")}`;
  }

  if (/^[0-9a-f]{6}$/i.test(trimmed)) {
    return `#${trimmed}`;
  }

  return null;
}

function resolveMarkerColour(driverTeamColour: string | null | undefined, fallbackTeamColour: string | null | undefined): string {
  return normaliseHexColour(driverTeamColour) ?? normaliseHexColour(fallbackTeamColour) ?? FALLBACK_MARKER_COLOUR;
}
