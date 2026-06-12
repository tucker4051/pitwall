import { getTeamColourProfile } from "./team-colours";
import type { TeamColourProfile } from "./team-colours";
import type { TimingDriver } from "./types";

export type DriverIdentity = {
  readonly abbreviation: string;
  readonly teamName: string;
  readonly teamProfile: TeamColourProfile;
};

export function getDriverIdentity(driver: TimingDriver | null | undefined): DriverIdentity {
  const teamName = driver?.teamName ?? "Unknown team";

  return {
    abbreviation: driver?.abbreviation ?? "---",
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
