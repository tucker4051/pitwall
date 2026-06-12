import type { ConnectionState, MeetingState, SessionState, TimingDriver } from "./types";

export type TimingTowerRow = TimingDriver & {
  readonly rowKey: string;
  readonly displayPosition: string;
  readonly displayLabel: string;
  readonly hasDriverMetadata: boolean;
};

export type TimingTowerRowsResult = {
  readonly rows: readonly TimingTowerRow[];
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
  timingDrivers
}: BuildTimingTowerRowsInput): TimingTowerRowsResult {
  if (dataMode === "mock") {
    return {
      rows: mergeDriverRows(mockTimingTowerDrivers, drivers, timingDrivers),
      emptyState: null
    };
  }

  const rows = mergeDriverRows([], drivers, timingDrivers);

  if (rows.length > 0) {
    return {
      rows,
      emptyState: null
    };
  }

  if (!meeting.meetingKey) {
    return {
      rows: [],
      emptyState: "no-active-meeting"
    };
  }

  if (!session.sessionKey && !session.name && !session.type && !connection.sessionName && !connection.sessionType) {
    return {
      rows: [],
      emptyState: "no-live-session"
    };
  }

  if (session.driverMetadataStatus === "loading") {
    return {
      rows: [],
      emptyState: "loading-session-drivers"
    };
  }

  return {
    rows: [],
    emptyState: "waiting-for-driver-metadata"
  };
}

function mergeDriverRows(
  baseDrivers: readonly TimingDriver[],
  metadataDrivers: readonly TimingDriver[],
  timingDrivers: readonly TimingDriver[]
): readonly TimingTowerRow[] {
  const rowsByIdentity = new Map<string, TimingDriver>();

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
    .map(toTimingTowerRow)
    .sort(compareTimingTowerRows);
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
    gapToLeader: nextDriver.gapToLeader || existingDriver.gapToLeader || "--",
    intervalToAhead: nextDriver.intervalToAhead ?? existingDriver.intervalToAhead,
    lastLapTime: nextDriver.lastLapTime ?? existingDriver.lastLapTime,
    bestLapTime: nextDriver.bestLapTime ?? existingDriver.bestLapTime
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

function toTimingTowerRow(driver: TimingDriver): TimingTowerRow {
  return {
    ...driver,
    rowKey: getDriverRowKey(driver),
    displayPosition: driver.position === Number.MAX_SAFE_INTEGER ? "--" : String(driver.position).padStart(2, "0"),
    displayLabel: getTimingTowerDisplayLabel(driver),
    hasDriverMetadata: Boolean(getAcronym(driver))
  };
}

function compareTimingTowerRows(left: TimingTowerRow, right: TimingTowerRow): number {
  if (left.position !== right.position) {
    return left.position - right.position;
  }

  return (left.nameAcronym ?? left.abbreviation).localeCompare(right.nameAcronym ?? right.abbreviation);
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
