import type { CircuitTrackPoint } from "./circuit-info-types";

export type NormalisedTrackPoint = CircuitTrackPoint;

const VIEWBOX_SIZE = 100;
const VIEWBOX_PADDING = 8;

export function normaliseTrackPoints(points: readonly CircuitTrackPoint[]): readonly NormalisedTrackPoint[] {
  if (points.length === 0) {
    return [];
  }

  const bounds = points.reduce(
    (currentBounds, point) => ({
      minX: Math.min(currentBounds.minX, point.x),
      maxX: Math.max(currentBounds.maxX, point.x),
      minY: Math.min(currentBounds.minY, point.y),
      maxY: Math.max(currentBounds.maxY, point.y)
    }),
    {
      minX: Number.POSITIVE_INFINITY,
      maxX: Number.NEGATIVE_INFINITY,
      minY: Number.POSITIVE_INFINITY,
      maxY: Number.NEGATIVE_INFINITY
    }
  );

  const width = Math.max(bounds.maxX - bounds.minX, 1);
  const height = Math.max(bounds.maxY - bounds.minY, 1);
  const drawableSize = VIEWBOX_SIZE - VIEWBOX_PADDING * 2;
  const scale = drawableSize / Math.max(width, height);
  const renderedWidth = width * scale;
  const renderedHeight = height * scale;
  const offsetX = (VIEWBOX_SIZE - renderedWidth) / 2;
  const offsetY = (VIEWBOX_SIZE - renderedHeight) / 2;

  return points.map((point) => ({
    x: offsetX + (point.x - bounds.minX) * scale,
    y: VIEWBOX_SIZE - (offsetY + (point.y - bounds.minY) * scale)
  }));
}

export function combineCoordinateArrays(x: readonly number[], y: readonly number[]): readonly CircuitTrackPoint[] {
  const pointCount = Math.min(x.length, y.length);
  const points: CircuitTrackPoint[] = [];

  for (let index = 0; index < pointCount; index += 1) {
    const xValue = x[index];
    const yValue = y[index];

    if (xValue === undefined || yValue === undefined) {
      continue;
    }

    points.push({
      x: xValue,
      y: yValue
    });
  }

  return points;
}
