import { getTeamColourProfile } from "./team-colours";
import type { TeamColourProfile } from "./team-colours";
import type { TimingDriver } from "./types";

export type DriverIdentity = {
  readonly abbreviation: string;
  readonly displayAcronym: string;
  readonly teamName: string;
  readonly teamProfile: TeamColourProfile;
};

export function getDriverIdentity(driver: TimingDriver | null | undefined): DriverIdentity {
  const teamName = driver?.teamName ?? "Unknown team";

  return {
    abbreviation: driver?.abbreviation ?? "---",
    displayAcronym: getDriverDisplayAcronym(driver),
    teamName,
    teamProfile: getTeamColourProfile(teamName)
  };
}

export function findDriverForPosition(
  abbreviationOrNumber: string,
  drivers: readonly TimingDriver[]
): TimingDriver | undefined {
  const numericDriverNumber = Number(abbreviationOrNumber);

  if (Number.isFinite(numericDriverNumber)) {
    return drivers.find((driver) => driver.driverNumber === numericDriverNumber);
  }

  return drivers.find((driver) => driver.abbreviation === abbreviationOrNumber);
}

export function getDriverDisplayAcronym(driver: TimingDriver | null | undefined): string {
  return (
    normaliseAcronym(driver?.nameAcronym) ??
    normaliseAcronym(driver?.abbreviation) ??
    deriveInitials(driver?.fullName) ??
    (driver?.driverNumber ? String(driver.driverNumber) : "---")
  );
}

function normaliseAcronym(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  const trimmedValue = value.trim();

  if (!trimmedValue || /^#?\d+$/.test(trimmedValue)) {
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
