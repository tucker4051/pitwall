"use client";

import { useState } from "react";

import { getDriverIdentity } from "./driver-identity";
import { formatLapDuration, getCompoundClassName } from "./format";
import { getTeamFocusAccentStyle, getTeamStripStyle } from "./team-colours";
import type { TimingTowerRow, TimingTowerRowsResult } from "./timing-tower-data";
import type { TelemetrySnapshot, TimingDriver, TyreStint } from "./types";

type DriverFocusPanelProps = {
  readonly driver: TimingTowerRow | null;
  readonly timingColumnHeader: TimingTowerRowsResult["timingColumnHeader"];
  readonly stint: TyreStint | null;
  readonly telemetry: TelemetrySnapshot | null;
};

export function DriverFocusPanel({ driver, timingColumnHeader, stint, telemetry }: DriverFocusPanelProps) {
  if (!driver) {
    return (
      <section className="flex h-full min-h-0 flex-col border border-slate-800 bg-[#0b1119]">
        <div className="flex h-10 items-center justify-between border-b border-slate-800 px-3">
          <h2 className="text-[11px] font-bold uppercase text-slate-300">Driver focus</h2>
          <span className="font-mono text-[11px] text-slate-500">None</span>
        </div>

        <div className="min-h-0 flex-1 overflow-auto p-4">
          <div className="border border-slate-800 bg-[#090d13] px-3 py-4">
            <p className="text-[11px] font-bold uppercase text-slate-300">Select a driver</p>
            <p className="mt-1 text-xs text-slate-500">Choose a driver from the timing tower to inspect live details.</p>
          </div>
        </div>
      </section>
    );
  }

  const identity = getDriverIdentity(driver);
  const displayAcronym = getSafeDriverDisplayLabel(driver, identity.displayAcronym);
  const metrics = getDriverFocusMetrics(driver, timingColumnHeader);
  const teamAccent = identity.teamProfile.visibleAccent;

  return (
    <section className="flex h-full min-h-0 flex-col border border-slate-800 bg-[#0b1119]">
      <div className="flex h-10 items-center justify-between border-b border-slate-800 px-3">
        <h2 className="text-[11px] font-bold uppercase text-slate-300">Driver focus</h2>
        <span className="font-mono text-[11px] text-cyan-300">Selected</span>
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-auto p-4">
        <div className="border-l-2 pl-3" style={getTeamFocusAccentStyle(identity.teamProfile)}>
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="mb-3 flex items-center gap-2">
                <span className="h-4 w-1.5 border" style={getTeamStripStyle(identity.teamProfile)} />
                <span className="font-mono text-[10px] uppercase text-slate-500">{identity.teamProfile.displayName}</span>
              </div>
              <p className="font-mono text-5xl font-black text-slate-100">{displayAcronym}</p>
              <p className="mt-1 truncate text-xs uppercase text-slate-500">{driver?.fullName ?? "Selected driver"}</p>
              <p className="truncate text-xs uppercase text-slate-400">{identity.teamName}</p>
            </div>
            <DriverHeadshot
              acronym={displayAcronym}
              fullName={driver?.fullName}
              headshotUrl={driver?.headshotUrl}
              teamAccent={teamAccent}
            />
          </div>
        </div>

        <div className="grid grid-cols-3 border border-slate-800">
          {metrics.map((metric) => (
            <Metric key={metric.label} label={metric.label} value={metric.value} detail={metric.detail} />
          ))}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="border border-slate-800 bg-[#090d13] p-3">
            <p className="text-[10px] font-bold uppercase text-slate-500">Tyre stint</p>
            <TyreStintSummary stint={stint} latestLapNumber={driver?.latestLapNumber} />
          </div>
          <div className="border border-slate-800 bg-[#090d13] p-3">
            <LapDetail driver={driver} />
          </div>
        </div>

        <div className="border border-slate-800 bg-[#090d13] p-3">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[10px] font-bold uppercase text-slate-500">Telemetry preview</p>
            <span className="h-2 w-2 bg-emerald-400" />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <Telemetry label="Speed" value={telemetry ? `${telemetry.speed}` : "--"} unit="kph" />
            <Telemetry label="RPM" value={telemetry ? `${telemetry.rpm}` : "--"} unit="" />
            <Telemetry label="Gear" value={telemetry ? `${telemetry.gear}` : "--"} unit="" />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Bar label="Throttle" value={telemetry?.throttle ?? 0} tone="cyan" />
            <Bar label="Brake" value={telemetry?.brake ? 100 : 0} tone="red" />
          </div>
        </div>
      </div>
    </section>
  );
}

function DriverHeadshot({
  acronym,
  fullName,
  headshotUrl,
  teamAccent
}: {
  readonly acronym: string;
  readonly fullName: string | undefined;
  readonly headshotUrl: string | undefined;
  readonly teamAccent: string;
}) {
  const [failedHeadshotUrl, setFailedHeadshotUrl] = useState<string | null>(null);

  const shouldShowImage = Boolean(headshotUrl && failedHeadshotUrl !== headshotUrl);

  return (
    <div
      className="flex h-24 w-24 shrink-0 items-end justify-center overflow-hidden border border-slate-800 bg-[#070b11]"
      style={{
        borderColor: `${teamAccent}66`,
        boxShadow: `inset 0 -18px 34px ${teamAccent}22`
      }}
    >
      {shouldShowImage ? (
        <img
          src={headshotUrl}
          alt={fullName ? `${fullName} headshot` : "Selected driver headshot"}
          className="h-full w-full object-contain object-bottom"
          onError={() => {
            if (headshotUrl) {
              setFailedHeadshotUrl(headshotUrl);
            }
          }}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-slate-950/70">
          <span className="font-mono text-2xl font-black uppercase text-slate-500">{acronym}</span>
        </div>
      )}
    </div>
  );
}

function Metric({
  label,
  value,
  detail
}: {
  readonly label: string;
  readonly value: string;
  readonly detail?: string;
}) {
  return (
    <div className="border-r border-slate-800 p-3 last:border-r-0">
      <p className="text-[10px] font-bold uppercase text-slate-500">{label}</p>
      <p className="mt-1 font-mono text-lg font-bold tabular-nums text-slate-100">{value}</p>
      {detail ? <p className="font-mono text-[10px] uppercase text-slate-500">{detail}</p> : null}
    </div>
  );
}

function getDriverFocusMetrics(
  driver: TimingTowerRow | null,
  timingColumnHeader: TimingTowerRowsResult["timingColumnHeader"]
): readonly { readonly label: string; readonly value: string; readonly detail?: string }[] {
  if (!driver) {
    return [
      { label: timingColumnHeader === "BEST" ? "Rank" : "Pos", value: "--" },
      { label: timingColumnHeader === "INT" ? "Int" : "Best lap", value: "--" },
      { label: timingColumnHeader === "INT" ? "Gap" : "Last lap", value: "--" }
    ];
  }

  if (timingColumnHeader === "BEST") {
    return [
      { label: "Rank", value: driver.displayPosition === "--" ? "--" : `P${driver.displayPosition}` },
      { label: "Best lap", value: driver.bestLapTime ?? formatLapDuration(driver.bestLapDuration) },
      {
        label: "Last lap",
        value: formatLapDuration(driver.latestLapDuration),
        detail: driver.latestLapNumber ? `Lap ${driver.latestLapNumber}` : undefined
      }
    ];
  }

  if (timingColumnHeader === "INT") {
    return [
      { label: "Pos", value: formatRacePosition(driver) },
      { label: "Int", value: driver.displayTimingValue },
      { label: "Gap", value: driver.gapToLeader || "--" }
    ];
  }

  return [
    { label: "Pos", value: formatRacePosition(driver) },
    { label: "Best lap", value: driver.bestLapTime ?? formatLapDuration(driver.bestLapDuration) },
    {
      label: "Last lap",
      value: formatLapDuration(driver.latestLapDuration),
      detail: driver.latestLapNumber ? `Lap ${driver.latestLapNumber}` : undefined
    }
  ];
}

function formatRacePosition(driver: TimingDriver): string {
  return Number.isFinite(driver.position) && driver.position > 0 && driver.position !== Number.MAX_SAFE_INTEGER
    ? `P${driver.position}`
    : "--";
}

function getSafeDriverDisplayLabel(driver: TimingTowerRow | null, fallback: string): string {
  const label = driver?.displayLabel ?? fallback;

  return /^#?\d+$/.test(label.trim()) ? "---" : label;
}

function LapDetail({ driver }: { readonly driver: TimingTowerRow | null }) {
  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-bold uppercase text-slate-500">Lap detail</p>
        {driver?.latestIsPitOutLap ? (
          <span className="border border-cyan-400/30 bg-cyan-400/10 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase text-cyan-200">
            Out lap
          </span>
        ) : null}
      </div>
      <div className="mt-2 flex items-baseline justify-between gap-2">
        <span className="font-mono text-sm font-bold text-slate-200">
          {driver?.latestLapNumber ? `Lap ${driver.latestLapNumber}` : "Lap --"}
        </span>
        <span className="font-mono text-xs tabular-nums text-slate-500">
          {formatLapDuration(driver?.latestLapDuration)}
        </span>
      </div>
      <div className="mt-2 grid grid-cols-3 gap-x-2 gap-y-1 font-mono text-[10px] uppercase">
        <LapDetailValue label="S1" value={formatSectorDuration(driver?.latestSector1Duration)} />
        <LapDetailValue label="S2" value={formatSectorDuration(driver?.latestSector2Duration)} />
        <LapDetailValue label="S3" value={formatSectorDuration(driver?.latestSector3Duration)} />
        <LapDetailValue label="I1" value={formatSpeed(driver?.latestI1Speed)} />
        <LapDetailValue label="I2" value={formatSpeed(driver?.latestI2Speed)} />
        <LapDetailValue label="ST" value={formatSpeed(driver?.latestSpeedTrap)} />
      </div>
    </div>
  );
}

function LapDetailValue({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div>
      <p className="text-[9px] font-bold text-slate-600">{label}</p>
      <p className="tabular-nums text-slate-200">{value}</p>
    </div>
  );
}

function TyreStintSummary({
  stint,
  latestLapNumber
}: {
  readonly stint: TyreStint | null;
  readonly latestLapNumber: number | undefined;
}) {
  if (!stint) {
    return (
      <div className="mt-2">
        <p className="text-xs font-bold uppercase text-slate-400">No stint data</p>
        <p className="mt-1 text-[10px] uppercase text-slate-600">Waiting for OpenF1 stints</p>
      </div>
    );
  }

  const age = calculateDisplayTyreAge(stint, latestLapNumber);
  const lapRange = formatLapRange(stint);

  return (
    <div className="mt-2 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className={`border px-2 py-1 text-[10px] font-bold uppercase ${getCompoundClassName(stint.compound)}`}>
          {stint.compound ?? "---"}
        </span>
        <span className="font-mono text-[11px] uppercase text-slate-400">Stint {stint.stintNumber}</span>
      </div>
      <div className="grid grid-cols-2 gap-2 font-mono text-[11px] uppercase">
        <div>
          <p className="text-[9px] font-bold text-slate-600">Age</p>
          <p className="text-slate-200">{age}</p>
        </div>
        <div>
          <p className="text-[9px] font-bold text-slate-600">Laps</p>
          <p className="text-slate-200">{lapRange}</p>
        </div>
      </div>
    </div>
  );
}

function calculateDisplayTyreAge(stint: TyreStint, latestLapNumber: number | undefined): string {
  const ageFromCompletedRange =
    stint.lapStart !== undefined && stint.lapEnd !== undefined && stint.lapEnd >= stint.lapStart
      ? (stint.tyreAgeAtStart ?? 0) + (stint.lapEnd - stint.lapStart + 1)
      : null;

  const ageFromLatestLap =
    stint.lapStart !== undefined && latestLapNumber !== undefined && latestLapNumber >= stint.lapStart
      ? (stint.tyreAgeAtStart ?? 0) + (latestLapNumber - stint.lapStart + 1)
      : null;

  const age = ageFromCompletedRange ?? ageFromLatestLap ?? stint.tyreAgeAtStart ?? stint.stintAgeLaps;

  return Number.isFinite(age) && age >= 0 ? `${age} laps` : "--";
}

function formatLapRange(stint: TyreStint): string {
  if (stint.lapStart !== undefined && stint.lapEnd !== undefined) {
    return `${stint.lapStart}-${stint.lapEnd}`;
  }

  if (stint.lapStart !== undefined) {
    return `${stint.lapStart}-now`;
  }

  if (stint.lapEnd !== undefined) {
    return `--${stint.lapEnd}`;
  }

  return "--";
}

function formatSectorDuration(value: number | undefined): string {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value.toFixed(3) : "--";
}

function formatSpeed(value: number | undefined): string {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? `${Math.round(value)} km/h` : "--";
}

function Telemetry({ label, value, unit }: { readonly label: string; readonly value: string; readonly unit: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase text-slate-500">{label}</p>
      <p className="font-mono text-sm font-bold text-slate-100">
        {value} <span className="text-[10px] text-slate-500">{unit}</span>
      </p>
    </div>
  );
}

function Bar({ label, value, tone }: { readonly label: string; readonly value: number; readonly tone: "cyan" | "red" }) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-[10px] uppercase text-slate-500">
        <span>{label}</span>
        <span className="font-mono">{value}%</span>
      </div>
      <div className="h-1.5 bg-slate-800">
        <div className={`h-full ${tone === "cyan" ? "bg-cyan-300" : "bg-red-500"}`} style={{ width: `${Math.min(100, value)}%` }} />
      </div>
    </div>
  );
}
