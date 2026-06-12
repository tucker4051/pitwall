import { getDriverIdentity } from "./driver-identity";
import { getCompoundClassName } from "./format";
import { getTeamFocusAccentStyle, getTeamStripStyle } from "./team-colours";
import type { TelemetrySnapshot, TimingDriver, TyreStint } from "./types";

type DriverFocusPanelProps = {
  readonly driver: TimingDriver | null;
  readonly stint: TyreStint | null;
  readonly telemetry: TelemetrySnapshot | null;
};

export function DriverFocusPanel({ driver, stint, telemetry }: DriverFocusPanelProps) {
  const identity = getDriverIdentity(driver);

  return (
    <section className="flex h-full min-h-0 flex-col border border-slate-800 bg-[#0b1119]">
      <div className="flex h-10 items-center justify-between border-b border-slate-800 px-3">
        <h2 className="text-[11px] font-bold uppercase text-slate-300">Driver focus</h2>
        <span className="font-mono text-[11px] text-cyan-300">Selected</span>
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-auto p-4">
        {!driver ? (
          <div className="border border-slate-800 bg-[#090d13] px-3 py-4">
            <p className="text-[11px] font-bold uppercase text-slate-300">Waiting for driver data</p>
            <p className="mt-1 text-xs text-slate-500">Select a driver once live timing or driver metadata arrives.</p>
          </div>
        ) : null}

        <div className="border-l-2 pl-3" style={getTeamFocusAccentStyle(identity.teamProfile)}>
          <div className="mb-3 flex items-center gap-2">
            <span className="h-4 w-1.5 border" style={getTeamStripStyle(identity.teamProfile)} />
            <span className="font-mono text-[10px] uppercase text-slate-500">{identity.teamProfile.displayName}</span>
          </div>
          <p className="font-mono text-5xl font-black text-slate-100">{driver?.abbreviation ?? "---"}</p>
          <p className="mt-1 text-xs uppercase text-slate-500">{driver?.fullName ?? "Selected driver"}</p>
          <p className="text-xs uppercase text-slate-400">{identity.teamName}</p>
        </div>

        <div className="grid grid-cols-3 border border-slate-800">
          <Metric label="Pos" value={driver ? `P${driver.position}` : "--"} />
          <Metric label="Gap" value={driver?.gapToLeader || "--"} />
          <Metric label="Int" value={driver?.intervalToAhead ?? "--"} />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="border border-slate-800 bg-[#090d13] p-3">
            <p className="text-[10px] font-bold uppercase text-slate-500">Tyre stint</p>
            <div className="mt-2 flex items-center gap-2">
              <span className={`border px-2 py-1 text-[10px] font-bold uppercase ${getCompoundClassName(stint?.compound)}`}>
                {stint?.compound ?? "---"}
              </span>
              <span className="font-mono text-sm text-slate-200">{stint ? `${stint.stintAgeLaps} laps` : "--"}</span>
            </div>
          </div>
          <div className="border border-slate-800 bg-[#090d13] p-3">
            <p className="text-[10px] font-bold uppercase text-slate-500">Lap info</p>
            <p className="mt-2 font-mono text-sm text-slate-200">{driver?.lastLapTime ?? "--"} last</p>
            <p className="font-mono text-xs text-slate-500">{driver?.bestLapTime ?? "--"} best</p>
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

        <div className="grid gap-2">
          <AnalysisStrip label="Sector delta" value="+0.084" tone="amber" />
          <AnalysisStrip label="Battery state" value="Deploy" tone="cyan" />
          <AnalysisStrip label="Track status" value="Clear air" tone="green" />
        </div>
      </div>
    </section>
  );
}

function Metric({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div className="border-r border-slate-800 p-3 last:border-r-0">
      <p className="text-[10px] font-bold uppercase text-slate-500">{label}</p>
      <p className="mt-1 font-mono text-lg font-bold tabular-nums text-slate-100">{value}</p>
    </div>
  );
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

function AnalysisStrip({ label, value, tone }: { readonly label: string; readonly value: string; readonly tone: "amber" | "cyan" | "green" }) {
  const toneClassName =
    tone === "amber" ? "text-amber-300" : tone === "cyan" ? "text-cyan-300" : "text-emerald-300";

  return (
    <div className="flex items-center justify-between border border-slate-800 bg-[#090d13] px-3 py-2 text-xs">
      <span className="font-bold uppercase text-slate-500">{label}</span>
      <span className={`font-mono font-bold ${toneClassName}`}>{value}</span>
    </div>
  );
}
