import type { CSSProperties } from "react";

export type TeamKey =
  | "red-bull-racing"
  | "ferrari"
  | "mclaren"
  | "mercedes"
  | "aston-martin"
  | "williams"
  | "alpine"
  | "audi"
  | "haas"
  | "cadillac"
  | "unknown";

export type TeamColourProfile = {
  readonly key: TeamKey;
  readonly displayName: string;
  readonly primary: string;
  readonly secondary: string;
  readonly optionalAccent?: string;
  readonly textOnPrimary: string;
  readonly visibleAccent: string;
  readonly isLightPrimary: boolean;
};

export const TEAM_COLOUR_PROFILES: Readonly<Record<TeamKey, TeamColourProfile>> = {
  "red-bull-racing": {
    key: "red-bull-racing",
    displayName: "Red Bull Racing",
    primary: "#3671C6",
    secondary: "#FFFFFF",
    optionalAccent: "#FCD700",
    textOnPrimary: "#FFFFFF",
    visibleAccent: "#3671C6",
    isLightPrimary: false
  },
  ferrari: {
    key: "ferrari",
    displayName: "Ferrari",
    primary: "#E8002D",
    secondary: "#000000",
    textOnPrimary: "#FFFFFF",
    visibleAccent: "#E8002D",
    isLightPrimary: false
  },
  mclaren: {
    key: "mclaren",
    displayName: "McLaren",
    primary: "#FF8000",
    secondary: "#111111",
    textOnPrimary: "#111111",
    visibleAccent: "#FF8000",
    isLightPrimary: false
  },
  mercedes: {
    key: "mercedes",
    displayName: "Mercedes",
    primary: "#C8CCCE",
    secondary: "#00D7B6",
    textOnPrimary: "#05070b",
    visibleAccent: "#00D7B6",
    isLightPrimary: true
  },
  "aston-martin": {
    key: "aston-martin",
    displayName: "Aston Martin",
    primary: "#00665E",
    secondary: "#B9C600",
    textOnPrimary: "#FFFFFF",
    visibleAccent: "#00665E",
    isLightPrimary: false
  },
  williams: {
    key: "williams",
    displayName: "Williams",
    primary: "#1868DB",
    secondary: "#000000",
    textOnPrimary: "#FFFFFF",
    visibleAccent: "#1868DB",
    isLightPrimary: false
  },
  alpine: {
    key: "alpine",
    displayName: "Alpine",
    primary: "#00A1E8",
    secondary: "#FF87BC",
    textOnPrimary: "#05070b",
    visibleAccent: "#00A1E8",
    isLightPrimary: false
  },
  audi: {
    key: "audi",
    displayName: "Audi",
    primary: "#101319",
    secondary: "#F50537",
    textOnPrimary: "#FFFFFF",
    visibleAccent: "#F50537",
    isLightPrimary: false
  },
  haas: {
    key: "haas",
    displayName: "Haas",
    primary: "#FFFFFF",
    secondary: "#E6002D",
    textOnPrimary: "#05070b",
    visibleAccent: "#E6002D",
    isLightPrimary: true
  },
  cadillac: {
    key: "cadillac",
    displayName: "Cadillac",
    primary: "#FFFFFF",
    secondary: "#000000",
    textOnPrimary: "#05070b",
    visibleAccent: "#FFFFFF",
    isLightPrimary: true
  },
  unknown: {
    key: "unknown",
    displayName: "Unknown team",
    primary: "#475569",
    secondary: "#94A3B8",
    textOnPrimary: "#FFFFFF",
    visibleAccent: "#64748B",
    isLightPrimary: false
  }
};

const TEAM_NAME_ALIASES: ReadonlyArray<readonly [TeamKey, readonly string[]]> = [
  ["red-bull-racing", ["redbull", "redbullracing", "oracle red bull racing", "rbr"]],
  ["ferrari", ["ferrari", "scuderia ferrari"]],
  ["mclaren", ["mclaren", "mclaren formula 1 team"]],
  ["mercedes", ["mercedes", "mercedes-amg", "mercedes amg", "mercedes-amg petronas"]],
  ["aston-martin", ["astonmartin", "aston martin", "aston martin aramco"]],
  ["williams", ["williams", "williams racing"]],
  ["alpine", ["alpine", "bwt alpine"]],
  ["audi", ["audi", "sauber", "stake", "kick sauber", "stake f1 team kick sauber"]],
  ["haas", ["haas", "moneygram haas"]],
  ["cadillac", ["cadillac", "cadillac f1"]]
];

export function normaliseTeamName(teamName: string | null | undefined): TeamKey {
  if (!teamName) {
    return "unknown";
  }

  const canonicalName = teamName.toLowerCase().replace(/[^a-z0-9]/g, "");

  for (const [teamKey, aliases] of TEAM_NAME_ALIASES) {
    if (aliases.some((alias) => canonicalName.includes(alias.toLowerCase().replace(/[^a-z0-9]/g, "")))) {
      return teamKey;
    }
  }

  return "unknown";
}

export function getTeamColourProfile(teamName: string | null | undefined): TeamColourProfile {
  return TEAM_COLOUR_PROFILES[normaliseTeamName(teamName)];
}

export function getTeamStripStyle(profile: TeamColourProfile): CSSProperties {
  return {
    backgroundColor: profile.primary,
    borderColor: profile.isLightPrimary ? profile.secondary : profile.primary
  };
}

export function getTeamMarkerStyle(profile: TeamColourProfile, selected: boolean): CSSProperties {
  return {
    backgroundColor: profile.primary,
    borderColor: profile.isLightPrimary ? profile.secondary : profile.visibleAccent,
    color: profile.textOnPrimary,
    boxShadow: selected ? `0 0 0 2px #00D7B666, 0 0 18px ${profile.visibleAccent}55` : undefined
  };
}

export function getTeamFocusAccentStyle(profile: TeamColourProfile): CSSProperties {
  return {
    borderLeftColor: profile.visibleAccent,
    boxShadow: `inset 2px 0 0 ${profile.primary}`
  };
}
