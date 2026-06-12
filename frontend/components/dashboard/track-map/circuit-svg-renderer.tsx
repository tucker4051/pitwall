import type { CircuitInfo } from "./circuit-info-types";
import { combineCoordinateArrays, normaliseTrackPoints } from "./normalise-track-points";

type CircuitSvgRendererProps = {
  readonly circuitInfo: CircuitInfo;
};

const SHOW_CORNER_LABELS = true;

export function CircuitSvgRenderer({ circuitInfo }: CircuitSvgRendererProps) {
  const rawTrackPoints = combineCoordinateArrays(circuitInfo.x, circuitInfo.y);
  const trackPoints = normaliseTrackPoints(rawTrackPoints);
  const pathData = toPolylinePoints(trackPoints);
  const normalisedCorners = SHOW_CORNER_LABELS
    ? normaliseTrackPoints(circuitInfo.corners.map((corner) => corner.trackPosition))
    : [];

  return (
    <svg className="h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Circuit map">
      <rect x="0" y="0" width="100" height="100" fill="#070c13" />
      <g opacity="0.28">
        <path d="M0 20H100M0 40H100M0 60H100M0 80H100M20 0V100M40 0V100M60 0V100M80 0V100" stroke="#1d2a38" strokeWidth="0.18" />
      </g>
      <polyline
        points={pathData}
        fill="none"
        stroke="#1d2734"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="4.8"
      />
      <polyline
        points={pathData}
        fill="none"
        stroke="#9aa7b5"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.35"
      />
      <polyline
        points={pathData}
        fill="none"
        stroke="#19d3c5"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeOpacity="0.22"
        strokeWidth="0.45"
      />
      {SHOW_CORNER_LABELS
        ? circuitInfo.corners.map((corner, index) => {
            const point = normalisedCorners[index];

            if (!point) {
              return null;
            }

            return (
              <g key={`corner-${corner.number}`} transform={`translate(${point.x + 2.2} ${point.y - 2.2})`}>
                <text
                  x="0"
                  y="0.72"
                  fill="#fbbf24"
                  fontFamily="var(--font-geist-mono), monospace"
                  fontSize="2.25"
                  fontWeight="800"
                  paintOrder="stroke"
                  stroke="#05070b"
                  strokeWidth="0.45"
                  textAnchor="middle"
                >
                  {corner.number}
                </text>
              </g>
            );
          })
        : null}
    </svg>
  );
}

function toPolylinePoints(points: readonly { readonly x: number; readonly y: number }[]): string {
  return points.map((point) => `${point.x.toFixed(3)},${point.y.toFixed(3)}`).join(" ");
}
