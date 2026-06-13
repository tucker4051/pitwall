import type { ConnectionState, MeetingState, SessionState, TimingDriver, TyreStint } from "./types";
import { formatLapDuration } from "./format";

export type TimingTowerRow = TimingDriver & {
  readonly rowKey: string;
  readonly displayPosition: string;
  readonly displayLabel: string;
  readonly displayTimingValue: string;
  readonly displayTyreCompound: string;
  readonly tyreCompound: TyreStint["compound"] | "unknown" | null;
  readonly hasDriverMetadata: boolean;
};

export type TimingTowerRowsResult = {
  readonly rows: readonly TimingTowerRow[];
  readonly timingColumnHeader: "BEST" | "INT" | "TIME";
  readonly emptyState:
    | "no-active-meeting"
    | "no-live-session"
    | "loading-session-drivers"
    | "waiting-for-driver-metadata"
    | null;
};

type BuildTimingTowerRowsInput = {
  readonly dataMode: ConnectionState["dataMode"];
  readonly meeting: MeetingState;
  readonly session: SessionState;
  readonly connection: ConnectionState;
  readonly drivers: readonly TimingDriver[];
  readonly timingDrivers: readonly TimingDriver[];
  readonly stints: readonly TyreStint[];
};

export const mockTimingTowerDrivers: readonly TimingDriver[] = [
  { position: 1, driverNumber: 1, abbreviation: "VER", fullName: "Max Verstappen", teamName: "Red Bull Racing", gapToLeader: "LEADER", intervalToAhead: "--" },
  { position: 2, driverNumber: 4, abbreviation: "NOR", fullName: "Lando Norris", teamName: "McLaren", gapToLeader: "+1.234", intervalToAhead: "+1.234" },
  { position: 3, driverNumber: 16, abbreviation: "LEC", fullName: "Charles Leclerc", teamName: "Ferrari", gapToLeader: "+2.468", intervalToAhead: "+1.234" },
  { position: 4, driverNumber: 81, abbreviation: "PIA", fullName: "Oscar Piastri", teamName: "McLaren", gapToLeader: "+4.112", intervalToAhead: "+1.644" },
  { position: 5, driverNumber: 55, abbreviation: "SAI", fullName: "Carlos Sainz", teamName: "Williams", gapToLeader: "+5.807", intervalToAhead: "+1.695" },
  { position: 6, driverNumber: 63, abbreviation: "RUS", fullName: "George Russell", teamName: "Mercedes", gapToLeader: "+7.033", intervalToAhead: "+1.226" },
  { position: 7, driverNumber: 44, abbreviation: "HAM", fullName: "Lewis Hamilton", teamName: "Ferrari", gapToLeader: "+8.540", intervalToAhead: "+1.507" },
  { position: 8, driverNumber: 14, abbreviation: "ALO", fullName: "Fernando Alonso", teamName: "Aston Martin", gapToLeader: "+10.120", intervalToAhead: "+1.580" },
  { position: 9, driverNumber: 18, abbreviation: "STR", fullName: "Lance Stroll", teamName: "Aston Martin", gapToLeader: "+12.408", intervalToAhead: "+2.288" },
  { position: 10, driverNumber: 23, abbreviation: "ALB", fullName: "Alexander Albon", teamName: "Williams", gapToLeader: "+14.002", intervalToAhead: "+1.594" },
  { position: 11, driverNumber: 31, abbreviation: "OCO", fullName: "Esteban Ocon", teamName: "Haas", gapToLeader: "+15.421", intervalToAhead: "+1.419" },
  { position: 12, driverNumber: 10, abbreviation: "GAS", fullName: "Pierre Gasly", teamName: "Alpine", gapToLeader: "+16.903", intervalToAhead: "+1.482" },
  { position: 13, driverNumber: 22, abbreviation: "TSU", fullName: "Yuki Tsunoda", teamName: "Red Bull Racing", gapToLeader: "+18.771", intervalToAhead: "+1.868" },
  { position: 14, driverNumber: 27, abbreviation: "HUL", fullName: "Nico Hulkenberg", teamName: "Sauber", gapToLeader: "+20.034", intervalToAhead: "+1.263" },
  { position: 15, driverNumber: 30, abbreviation: "LAW", fullName: "Liam Lawson", teamName: "Racing Bulls", gapToLeader: "+21.806", intervalToAhead: "+1.772" },
  { position: 16, driverNumber: 6, abbreviation: "HAD", fullName: "Isack Hadjar", teamName: "Racing Bulls", gapToLeader: "+23.552", intervalToAhead: "+1.746" },
  { position: 17, driverNumber: 87, abbreviation: "BEA", fullName: "Oliver Bearman", teamName: "Haas", gapToLeader: "+25.340", intervalToAhead: "+1.788" },
  { position: 18, driverNumber: 12, abbreviation: "ANT", fullName: "Andrea Kimi Antonelli", teamName: "Mercedes", gapToLeader: "+27.118", intervalToAhead: "+1.778" },
  { position: 19, driverNumber: 5, abbreviation: "BOR", fullName: "Gabriel Bortoleto", teamName: "Sauber", gapToLeader: "+29.004", intervalToAhead: "+1.886" },
  { position: 20, driverNumber: 43, abbreviation: "COL", fullName: "Franco Colapinto", teamName: "Alpine", gapToLeader: "+31.220", intervalToAhead: "+2.216" },
  { position: 21, driverNumber: 11, abbreviation: "PER", fullName: "Sergio Perez", teamName: "Cadillac", gapToLeader: "+33.900", intervalToAhead: "+2.680" },
  { position: 22, driverNumber: 77, abbreviation: "BOT", fullName: "Valtteri Bottas", teamName: "Cadillac", gapToLeader: "+36.500", intervalToAhead: "+2.600" }
];

export function buildTimingTowerRows({
  dataMode,
  meeting,
  session,
  connection,
  drivers,
  timingDrivers,
  stints
}: BuildTimingTowerRowsInput): TimingTowerRowsResult {
  const timingDisplayMode = getTimingDisplayMode(session.type ?? connection.sessionType);
  const timingColumnHeader = getTimingColumnHeader(timingDisplayMode);

  if (dataMode === "mock") {
    return {
      rows: mergeDriverRows(mockTimingTowerDrivers, drivers, timingDrivers, stints, timingDisplayMode),
      timingColumnHeader,
      emptyState: null
    };
  }

  const rows = mergeDriverRows([], drivers, timingDrivers, stints, timingDisplayMode);

  if (rows.length > 0) {
    return {
      rows,
      timingColumnHeader,
      emptyState: null
    };
  }

  if (!meeting.meetingKey) {
    return {
      rows: [],
      timingColumnHeader,
      emptyState: "no-active-meeting"
    };
  }

  if (!session.sessionKey && !session.name && !session.type && !connection.sessionName && !connection.sessionType) {
    return {
      rows: [],
      timingColumnHeader,
      emptyState: "no-live-session"
    };
  }

  if (session.driverMetadataStatus === "loading") {
    return {
      rows: [],
      timingColumnHeader,
      emptyState: "loading-session-drivers"
    };
  }

  return {
    rows: [],
    timingColumnHeader,
    emptyState: "waiting-for-driver-metadata"
  };
}

function mergeDriverRows(
  baseDrivers: readonly TimingDriver[],
  metadataDrivers: readonly TimingDriver[],
  timingDrivers: readonly TimingDriver[],
  stints: readonly TyreStint[],
  timingDisplayMode: TimingDisplayMode
): readonly TimingTowerRow[] {
  const rowsByIdentity = new Map<string, TimingDriver>();
  const latestStintsByDriver = createLatestStintsByDriver(stints);

  for (const driver of [...baseDrivers, ...metadataDrivers, ...timingDrivers]) {
    const rowKey = findExistingDriverRowKey(rowsByIdentity, driver) ?? getDriverRowKey(driver);
    const existingDriver = rowsByIdentity.get(rowKey);
    const mergedDriver = mergeDriver(existingDriver, driver);
    const stableRowKey = getDriverRowKey(mergedDriver);

    if (stableRowKey !== rowKey) {
      rowsByIdentity.delete(rowKey);
    }

    rowsByIdentity.set(stableRowKey, mergedDriver);
  }

  return Array.from(rowsByIdentity.values())
    .map((driver) => toTimingTowerRow(driver, latestStintsByDriver.get(driver.driverNumber ?? -1), timingDisplayMode))
    .sort((left, right) => compareTimingTowerRows(left, right, timingDisplayMode))
    .map((row, index) => applyDisplayPosition(row, index, timingDisplayMode));
}

function mergeDriver(existingDriver: TimingDriver | undefined, nextDriver: TimingDriver): TimingDriver {
  if (!existingDriver) {
    return normaliseDriver(nextDriver);
  }

  return normaliseDriver({
    ...existingDriver,
    ...nextDriver,
    nameAcronym: nextDriver.nameAcronym ?? existingDriver.nameAcronym,
    abbreviation: chooseDisplayAbbreviation(existingDriver, nextDriver),
    broadcastName: nextDriver.broadcastName ?? existingDriver.broadcastName,
    fullName: nextDriver.fullName ?? existingDriver.fullName,
    teamName: nextDriver.teamName ?? existingDriver.teamName,
    teamColour: nextDriver.teamColour ?? existingDriver.teamColour,
    headshotUrl: nextDriver.headshotUrl ?? existingDriver.headshotUrl,
    gapToLeader: nextDriver.gapToLeader || existingDriver.gapToLeader || "--",
    intervalToAhead: nextDriver.intervalToAhead ?? existingDriver.intervalToAhead,
    intervalUpdatedAt: nextDriver.intervalUpdatedAt ?? existingDriver.intervalUpdatedAt,
    latestInterval: nextDriver.latestInterval ?? existingDriver.latestInterval,
    lastLapTime: nextDriver.lastLapTime ?? existingDriver.lastLapTime,
    bestLapTime: nextDriver.bestLapTime ?? existingDriver.bestLapTime,
    bestLapDuration: nextDriver.bestLapDuration ?? existingDriver.bestLapDuration,
    latestLapDuration: nextDriver.latestLapDuration ?? existingDriver.latestLapDuration,
    latestLapNumber: nextDriver.latestLapNumber ?? existingDriver.latestLapNumber,
    latestLapUpdatedAt: nextDriver.latestLapUpdatedAt ?? existingDriver.latestLapUpdatedAt,
    latestSector1Duration: nextDriver.latestSector1Duration ?? existingDriver.latestSector1Duration,
    latestSector2Duration: nextDriver.latestSector2Duration ?? existingDriver.latestSector2Duration,
    latestSector3Duration: nextDriver.latestSector3Duration ?? existingDriver.latestSector3Duration,
    latestI1Speed: nextDriver.latestI1Speed ?? existingDriver.latestI1Speed,
    latestI2Speed: nextDriver.latestI2Speed ?? existingDriver.latestI2Speed,
    latestSpeedTrap: nextDriver.latestSpeedTrap ?? existingDriver.latestSpeedTrap,
    latestIsPitOutLap: nextDriver.latestIsPitOutLap ?? existingDriver.latestIsPitOutLap
  });
}

function normaliseDriver(driver: TimingDriver): TimingDriver {
  const fallbackAbbreviation = driver.driverNumber ? String(driver.driverNumber) : driver.abbreviation || "---";

  return {
    ...driver,
    abbreviation: driver.nameAcronym ?? driver.abbreviation ?? fallbackAbbreviation,
    position: Number.isFinite(driver.position) && driver.position > 0 ? driver.position : Number.MAX_SAFE_INTEGER,
    gapToLeader: driver.gapToLeader || "--",
    intervalToAhead: driver.intervalToAhead ?? "--"
  };
}

function toTimingTowerRow(
  driver: TimingDriver,
  stint: TyreStint | undefined,
  timingDisplayMode: TimingDisplayMode
): TimingTowerRow {
  const tyreCompound = normaliseTyreCompound(stint?.compound);

  return {
    ...driver,
    rowKey: getDriverRowKey(driver),
    displayPosition:
      timingDisplayMode === "interval" && driver.position !== Number.MAX_SAFE_INTEGER
        ? String(driver.position).padStart(2, "0")
        : "--",
    displayLabel: getTimingTowerDisplayLabel(driver),
    displayTimingValue: getTimingDisplayValue(driver, timingDisplayMode),
    displayTyreCompound: getTyreCompoundAbbreviation(tyreCompound),
    tyreCompound,
    hasDriverMetadata: Boolean(getAcronym(driver))
  };
}

function createLatestStintsByDriver(stints: readonly TyreStint[]): ReadonlyMap<number, TyreStint> {
  const latestStintsByDriver = new Map<number, TyreStint>();

  for (const stint of stints) {
    const existingStint = latestStintsByDriver.get(stint.driverNumber);

    if (!existingStint || compareStintRecency(stint, existingStint) > 0) {
      latestStintsByDriver.set(stint.driverNumber, stint);
    }
  }

  return latestStintsByDriver;
}

function compareStintRecency(left: TyreStint, right: TyreStint): number {
  if (left.stintNumber !== right.stintNumber) {
    return left.stintNumber - right.stintNumber;
  }

  return getStintLapSortValue(left) - getStintLapSortValue(right);
}

function getStintLapSortValue(stint: TyreStint): number {
  return stint.lapEnd ?? stint.lapStart ?? 0;
}

function normaliseTyreCompound(compound: string | null | undefined): TyreStint["compound"] | "unknown" | null {
  if (!compound) {
    return null;
  }

  const normalisedCompound = compound.toLowerCase().replace(/[^a-z]/g, "");

  if (normalisedCompound === "soft" || normalisedCompound === "sft") {
    return "soft";
  }

  if (normalisedCompound === "medium" || normalisedCompound === "med") {
    return "medium";
  }

  if (normalisedCompound === "hard" || normalisedCompound === "hrd") {
    return "hard";
  }

  if (normalisedCompound === "intermediate" || normalisedCompound === "intermediates" || normalisedCompound === "int") {
    return "intermediate";
  }

  if (normalisedCompound === "wet" || normalisedCompound === "wets") {
    return "wet";
  }

  return "unknown";
}

function getTyreCompoundAbbreviation(compound: TyreStint["compound"] | "unknown" | null): string {
  switch (compound) {
    case "soft":
      return "SFT";
    case "medium":
      return "MED";
    case "hard":
      return "HRD";
    case "intermediate":
      return "INT";
    case "wet":
      return "WET";
    case "unknown":
    case null:
      return "--";
  }
}

function compareTimingTowerRows(left: TimingTowerRow, right: TimingTowerRow, timingDisplayMode: TimingDisplayMode): number {
  if (timingDisplayMode === "best-lap") {
    const leftHasBestLap = isValidBestLapDuration(left.bestLapDuration);
    const rightHasBestLap = isValidBestLapDuration(right.bestLapDuration);

    if (leftHasBestLap && rightHasBestLap && left.bestLapDuration !== right.bestLapDuration) {
      return left.bestLapDuration - right.bestLapDuration;
    }

    if (leftHasBestLap !== rightHasBestLap) {
      return leftHasBestLap ? -1 : 1;
    }

    return compareDriverAcronym(left, right);
  }

  if (timingDisplayMode === "unknown") {
    return compareDriverAcronym(left, right);
  }

  if (left.position !== right.position) {
    return left.position - right.position;
  }

  return compareDriverAcronym(left, right);
}

function applyDisplayPosition(
  row: TimingTowerRow,
  index: number,
  timingDisplayMode: TimingDisplayMode
): TimingTowerRow {
  if (timingDisplayMode !== "best-lap") {
    return row;
  }

  return {
    ...row,
    displayPosition: isValidBestLapDuration(row.bestLapDuration) ? String(index + 1).padStart(2, "0") : "--"
  };
}

function compareDriverAcronym(left: TimingTowerRow, right: TimingTowerRow): number {
  return (left.nameAcronym ?? left.abbreviation).localeCompare(right.nameAcronym ?? right.abbreviation);
}

function isValidBestLapDuration(value: number | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function getDriverRowKey(driver: TimingDriver): string {
  if (driver.driverNumber) {
    return `driver-${driver.driverNumber}`;
  }

  return `abbr-${driver.abbreviation || "unknown"}`;
}

function chooseDisplayAbbreviation(existingDriver: TimingDriver, nextDriver: TimingDriver): string {
  if (nextDriver.nameAcronym) {
    return nextDriver.nameAcronym;
  }

  if (existingDriver.nameAcronym) {
    return existingDriver.nameAcronym;
  }

  if (isNumericDriverLabel(nextDriver.abbreviation) && !isNumericDriverLabel(existingDriver.abbreviation)) {
    return existingDriver.abbreviation;
  }

  return nextDriver.abbreviation || existingDriver.abbreviation;
}

function isNumericDriverLabel(value: string | null | undefined): boolean {
  return Boolean(value && /^#?\d+$/.test(value.trim()));
}

function getTimingTowerDisplayLabel(driver: TimingDriver): string {
  return getAcronym(driver) ?? deriveInitials(driver.fullName) ?? "---";
}

function getAcronym(driver: TimingDriver): string | null {
  return normaliseAcronym(driver.nameAcronym) ?? normaliseAcronym(driver.abbreviation);
}

function normaliseAcronym(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  const trimmedValue = value.trim();

  if (!trimmedValue || isNumericDriverLabel(trimmedValue)) {
    return null;
  }

  return trimmedValue.toUpperCase().slice(0, 3);
}

function deriveInitials(fullName: string | null | undefined): string | null {
  if (!fullName) {
    return null;
  }

  const words = fullName
    .trim()
    .split(/\s+/)
    .map((word) => word.replace(/[^a-z]/gi, ""))
    .filter(Boolean);

  if (words.length === 0) {
    return null;
  }

  if (words.length === 1) {
    return words[0].slice(0, 3).toUpperCase();
  }

  const firstInitial = words[0][0] ?? "";
  const lastNamePrefix = words[words.length - 1].slice(0, 2);
  const derived = `${firstInitial}${lastNamePrefix}`.toUpperCase();

  return derived || null;
}

function findExistingDriverRowKey(
  rowsByIdentity: ReadonlyMap<string, TimingDriver>,
  driver: TimingDriver
): string | undefined {
  for (const [rowKey, existingDriver] of rowsByIdentity) {
    const sameDriverNumber = Boolean(driver.driverNumber && existingDriver.driverNumber === driver.driverNumber);
    const sameAbbreviation = Boolean(driver.abbreviation && existingDriver.abbreviation === driver.abbreviation);

    if (sameDriverNumber || sameAbbreviation) {
      return rowKey;
    }
  }

  return undefined;
}

type TimingDisplayMode = "best-lap" | "interval" | "unknown";

function getTimingDisplayMode(sessionType: string | null | undefined): TimingDisplayMode {
  if (!sessionType) {
    return "unknown";
  }

  const normalized = sessionType.toLowerCase();

  if (
    normalized.includes("practice") ||
    normalized.includes("qualifying") ||
    normalized.includes("shootout")
  ) {
    return "best-lap";
  }

  if (normalized.includes("race") || normalized === "sprint") {
    return "interval";
  }

  return "unknown";
}

function getTimingColumnHeader(timingDisplayMode: TimingDisplayMode): "BEST" | "INT" | "TIME" {
  if (timingDisplayMode === "best-lap") {
    return "BEST";
  }

  if (timingDisplayMode === "interval") {
    return "INT";
  }

  return "TIME";
}

function getTimingDisplayValue(driver: TimingDriver, timingDisplayMode: TimingDisplayMode): string {
  if (timingDisplayMode === "best-lap") {
    return driver.bestLapTime ?? formatLapDuration(driver.bestLapDuration);
  }

  if (timingDisplayMode === "interval") {
    return driver.latestInterval ?? driver.intervalToAhead ?? "--";
  }

  return "--";
}
