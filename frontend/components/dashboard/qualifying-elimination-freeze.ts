import { isQualifyingStyleSession } from "./session-classification";
import { buildTimingTowerRows, type TimingTowerRow, type TimingTowerRowsResult } from "./timing-tower-data";
import type { DashboardState, MeetingState, SessionState } from "./types";

type FrozenQualifyingRow = {
  readonly row: TimingTowerRow;
  readonly eliminatedInPhase: 1 | 2;
};

export type QualifyingFreezeState = {
  readonly scopeKey: string;
  readonly frozenRows: readonly FrozenQualifyingRow[];
};

export type QualifyingEliminationResult = {
  readonly rowsResult: TimingTowerRowsResult;
  readonly eliminatedRowKeys: ReadonlySet<string>;
};

export const INITIAL_QUALIFYING_FREEZE_STATE: QualifyingFreezeState = {
  scopeKey: "no-meeting:no-session",
  frozenRows: []
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
      frozenRows: []
    };
  }

  const currentPhase = currentDashboard.session.qualifyingPhase;
  const isCurrentQualifyingSession = isQualifyingStyleSession(currentDashboard.session.type, currentDashboard.session.name);

  if (!isCurrentQualifyingSession) {
    return freezeState;
  }

  const currentRowsResult = buildTimingTowerRowsForDashboard(currentDashboard);
  const currentRows = applyQualifyingFreeze(currentRowsResult, freezeState, currentDashboard.session).rowsResult.rows;

  // TODO: Reconstruct missed Q1/Q2 eliminations from reliable REST/session result data
  // when the app loads directly into Q2 or Q3.
  if (currentPhase === 1 && nextPhase === 2) {
    return {
      scopeKey: nextScopeKey,
      frozenRows: mergeFrozenRows(freezeState.frozenRows, freezeRows(currentRows, 17, 22, 1))
    };
  }

  if (currentPhase === 2 && nextPhase === 3) {
    return {
      scopeKey: nextScopeKey,
      frozenRows: mergeFrozenRows(freezeState.frozenRows, freezeRows(currentRows, 11, 16, 2))
    };
  }

  return freezeState;
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

export function buildTimingTowerRowsForDashboard(dashboard: DashboardState): TimingTowerRowsResult {
  return buildTimingTowerRows({
    dataMode: dashboard.connection.dataMode,
    meeting: dashboard.meeting,
    session: dashboard.session,
    connection: dashboard.connection,
    drivers: dashboard.drivers,
    timingDrivers: dashboard.timing.drivers,
    stints: dashboard.stints
  });
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
