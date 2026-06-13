import { isQualifyingStyleSession } from "./session-classification";
import { buildTimingTowerRows, type TimingTowerRow, type TimingTowerRowsResult } from "./timing-tower-data";
import type { DashboardState, MeetingState, SessionState, TimingDriver } from "./types";
import { formatLapDuration } from "./format";

type FrozenQualifyingRow = {
  readonly row: TimingTowerRow;
  readonly eliminatedInPhase: 1 | 2;
};

type PhaseBestLap = {
  readonly driverNumber: number;
  readonly lapDuration: number;
  readonly lapNumber?: number;
  readonly lapUpdatedAt?: string;
};

type PhaseBestLapState = Readonly<Record<1 | 2 | 3, readonly PhaseBestLap[]>>;

export type QualifyingFreezeState = {
  readonly scopeKey: string;
  readonly frozenRows: readonly FrozenQualifyingRow[];
  readonly phaseBestLaps: PhaseBestLapState;
};

export type QualifyingEliminationResult = {
  readonly rowsResult: TimingTowerRowsResult;
  readonly eliminatedRowKeys: ReadonlySet<string>;
};

export const INITIAL_QUALIFYING_FREEZE_STATE: QualifyingFreezeState = {
  scopeKey: "no-meeting:no-session",
  frozenRows: [],
  phaseBestLaps: createEmptyPhaseBestLaps()
};

const EMPTY_ELIMINATED_ROW_KEYS = new Set<string>();

export function reduceQualifyingFreezeState({
  freezeState,
  currentDashboard,
  nextDashboard
}: {
  readonly freezeState: QualifyingFreezeState;
  readonly currentDashboard: DashboardState;
  readonly nextDashboard: DashboardState;
}): QualifyingFreezeState {
  const nextScopeKey = getQualifyingScopeKey(nextDashboard.meeting, nextDashboard.session);
  const nextPhase = nextDashboard.session.qualifyingPhase;
  const isNextQualifyingSession = isQualifyingStyleSession(nextDashboard.session.type, nextDashboard.session.name);

  if (!isNextQualifyingSession || nextPhase === null || freezeState.scopeKey !== nextScopeKey) {
    return {
      scopeKey: nextScopeKey,
      frozenRows: [],
      phaseBestLaps: createEmptyPhaseBestLaps()
    };
  }

  const currentPhase = currentDashboard.session.qualifyingPhase;
  const isCurrentQualifyingSession = isQualifyingStyleSession(currentDashboard.session.type, currentDashboard.session.name);
  const phaseBestLaps = updatePhaseBestLaps(freezeState.phaseBestLaps, currentDashboard, nextDashboard, nextPhase);

  if (!isCurrentQualifyingSession) {
    return {
      ...freezeState,
      phaseBestLaps
    };
  }

  const currentRowsResult = buildTimingTowerRowsForDashboard(currentDashboard, {
    ...freezeState,
    phaseBestLaps
  });
  const currentRows = applyQualifyingFreeze(currentRowsResult, freezeState, currentDashboard.session).rowsResult.rows;

  // TODO: Reconstruct missed Q1/Q2 eliminations from reliable REST/session result data
  // when the app loads directly into Q2 or Q3.
  if (currentPhase === 1 && nextPhase === 2) {
    return {
      scopeKey: nextScopeKey,
      frozenRows: mergeFrozenRows(freezeState.frozenRows, freezeRows(currentRows, 17, 22, 1)),
      phaseBestLaps
    };
  }

  if (currentPhase === 2 && nextPhase === 3) {
    return {
      scopeKey: nextScopeKey,
      frozenRows: mergeFrozenRows(freezeState.frozenRows, freezeRows(currentRows, 11, 16, 2)),
      phaseBestLaps
    };
  }

  return {
    ...freezeState,
    phaseBestLaps
  };
}

export function applyQualifyingFreeze(
  rowsResult: TimingTowerRowsResult,
  freezeState: QualifyingFreezeState,
  session: SessionState
): QualifyingEliminationResult {
  if (freezeState.frozenRows.length === 0 || !isQualifyingStyleSession(session.type, session.name) || session.qualifyingPhase === null) {
    return {
      rowsResult,
      eliminatedRowKeys: EMPTY_ELIMINATED_ROW_KEYS
    };
  }

  const eliminatedRowKeys = new Set(freezeState.frozenRows.map((frozenRow) => frozenRow.row.rowKey));

  return {
    rowsResult: {
      ...rowsResult,
      rows: applyQualifyingFrozenRows(rowsResult.rows, freezeState.frozenRows, session.qualifyingPhase)
    },
    eliminatedRowKeys
  };
}

export function buildTimingTowerRowsForDashboard(dashboard: DashboardState, freezeState?: QualifyingFreezeState): TimingTowerRowsResult {
  const phaseAdjustedDashboard = freezeState ? applyQualifyingPhaseBestLaps(dashboard, freezeState) : dashboard;

  return buildTimingTowerRows({
    dataMode: phaseAdjustedDashboard.connection.dataMode,
    meeting: phaseAdjustedDashboard.meeting,
    session: phaseAdjustedDashboard.session,
    connection: phaseAdjustedDashboard.connection,
    drivers: phaseAdjustedDashboard.drivers,
    timingDrivers: phaseAdjustedDashboard.timing.drivers,
    stints: phaseAdjustedDashboard.stints
  });
}

function applyQualifyingPhaseBestLaps(dashboard: DashboardState, freezeState: QualifyingFreezeState): DashboardState {
  const phase = dashboard.session.qualifyingPhase;

  if (!phase || !isQualifyingStyleSession(dashboard.session.type, dashboard.session.name)) {
    return dashboard;
  }

  const bestLapsByDriver = new Map(freezeState.phaseBestLaps[phase].map((lap) => [lap.driverNumber, lap]));

  return {
    ...dashboard,
    timing: {
      ...dashboard.timing,
      drivers: dashboard.timing.drivers.map((driver) => applyPhaseBestLapToDriver(driver, bestLapsByDriver.get(driver.driverNumber ?? -1)))
    }
  };
}

function applyPhaseBestLapToDriver(driver: TimingDriver, phaseBestLap: PhaseBestLap | undefined): TimingDriver {
  if (!driver.driverNumber) {
    return {
      ...driver,
      bestLapDuration: undefined,
      bestLapTime: undefined
    };
  }

  if (!phaseBestLap) {
    return {
      ...driver,
      bestLapDuration: undefined,
      bestLapTime: undefined
    };
  }

  return {
    ...driver,
    bestLapDuration: phaseBestLap.lapDuration,
    bestLapTime: formatLapDuration(phaseBestLap.lapDuration)
  };
}

function getQualifyingScopeKey(meeting: MeetingState, session: SessionState): string {
  return `${meeting.meetingKey ?? "no-meeting"}:${session.sessionKey ?? "no-session"}`;
}

function freezeRows(
  rows: readonly TimingTowerRow[],
  lowerRank: number,
  upperRank: number,
  eliminatedInPhase: 1 | 2
): readonly FrozenQualifyingRow[] {
  return rows
    .slice(lowerRank - 1, Math.min(rows.length, upperRank))
    .map((row) => ({
      row,
      eliminatedInPhase
    }));
}

function mergeFrozenRows(
  existingRows: readonly FrozenQualifyingRow[],
  nextRows: readonly FrozenQualifyingRow[]
): readonly FrozenQualifyingRow[] {
  const frozenRowsByKey = new Map(existingRows.map((frozenRow) => [frozenRow.row.rowKey, frozenRow]));

  for (const frozenRow of nextRows) {
    if (!frozenRowsByKey.has(frozenRow.row.rowKey)) {
      frozenRowsByKey.set(frozenRow.row.rowKey, frozenRow);
    }
  }

  return Array.from(frozenRowsByKey.values());
}

function applyQualifyingFrozenRows(
  rows: readonly TimingTowerRow[],
  frozenRows: readonly FrozenQualifyingRow[],
  qualifyingPhase: SessionState["qualifyingPhase"]
): readonly TimingTowerRow[] {
  const frozenRowsByKey = new Map(frozenRows.map((frozenRow) => [frozenRow.row.rowKey, frozenRow]));
  const activeRows = rows.filter((row) => !frozenRowsByKey.has(row.rowKey));
  const q2Rows = frozenRows.filter((row) => row.eliminatedInPhase === 2).map((row) => row.row);
  const q1Rows = frozenRows.filter((row) => row.eliminatedInPhase === 1).map((row) => row.row);

  if (qualifyingPhase === 3) {
    return [...applyActiveDisplayPositions(activeRows), ...q2Rows, ...q1Rows];
  }

  return [...applyActiveDisplayPositions(activeRows), ...q1Rows];
}

function applyActiveDisplayPositions(rows: readonly TimingTowerRow[]): readonly TimingTowerRow[] {
  return rows.map((row, index) => ({
    ...row,
    displayPosition: row.displayPosition === "--" ? "--" : String(index + 1).padStart(2, "0")
  }));
}

function updatePhaseBestLaps(
  phaseBestLaps: PhaseBestLapState,
  currentDashboard: DashboardState,
  nextDashboard: DashboardState,
  phase: 1 | 2 | 3
): PhaseBestLapState {
  const currentDriversByNumber = new Map(
    currentDashboard.timing.drivers
      .filter((driver): driver is TimingDriver & { readonly driverNumber: number } => driver.driverNumber !== undefined)
      .map((driver) => [driver.driverNumber, driver])
  );
  const phaseBestLapsByDriver = new Map(phaseBestLaps[phase].map((lap) => [lap.driverNumber, lap]));

  for (const nextDriver of nextDashboard.timing.drivers) {
    if (!nextDriver.driverNumber || !isValidLapDuration(nextDriver.latestLapDuration)) {
      continue;
    }

    const currentDriver = currentDriversByNumber.get(nextDriver.driverNumber);

    if (!isNewLatestLap(currentDriver, nextDriver)) {
      continue;
    }

    const existingBestLap = phaseBestLapsByDriver.get(nextDriver.driverNumber);

    if (!existingBestLap || nextDriver.latestLapDuration < existingBestLap.lapDuration) {
      phaseBestLapsByDriver.set(nextDriver.driverNumber, {
        driverNumber: nextDriver.driverNumber,
        lapDuration: nextDriver.latestLapDuration,
        lapNumber: nextDriver.latestLapNumber,
        lapUpdatedAt: nextDriver.latestLapUpdatedAt
      });
    }
  }

  return {
    ...phaseBestLaps,
    [phase]: Array.from(phaseBestLapsByDriver.values())
  };
}

function isNewLatestLap(currentDriver: TimingDriver | undefined, nextDriver: TimingDriver): boolean {
  if (nextDriver.latestLapNumber !== undefined && currentDriver?.latestLapNumber !== undefined) {
    return nextDriver.latestLapNumber > currentDriver.latestLapNumber;
  }

  if (nextDriver.latestLapUpdatedAt && currentDriver?.latestLapUpdatedAt) {
    return Date.parse(nextDriver.latestLapUpdatedAt) > Date.parse(currentDriver.latestLapUpdatedAt);
  }

  return currentDriver?.latestLapDuration !== nextDriver.latestLapDuration;
}

function isValidLapDuration(value: number | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function createEmptyPhaseBestLaps(): PhaseBestLapState {
  return {
    1: [],
    2: [],
    3: []
  };
}
