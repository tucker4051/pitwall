import { formatAge, formatNumber, formatTime } from "./format";
import type { ConnectionStatus, DashboardState } from "./types";

type TopStatusBarProps = {
  readonly dashboard: DashboardState;
  readonly socketStatus: ConnectionStatus;
  readonly now: number;
};

export function TopStatusBar({ dashboard, socketStatus, now }: TopStatusBarProps) {
  const sessionName = dashboard.session.name ?? dashboard.connection.sessionName ?? getFallbackSessionName(dashboard.connection.dataMode);
  const sessionType = dashboard.session.type ?? dashboard.connection.sessionType ?? getFallbackSessionType(dashboard.connection.dataMode);

  return (
    <header className="grid h-16 shrink-0 grid-cols-[220px_1fr_auto] items-center border-b border-slate-800 bg-[#080b10] px-4">
      <div className="flex items-center gap-3">
        <div className="h-8 w-1 bg-red-500" />
        <div>
          <p className="text-lg font-black uppercase text-slate-100">PitWall</p>
          <p className="text-[10px] font-semibold uppercase text-slate-500">Race operations</p>
        </div>
      </div>

      <div className="grid min-w-0 grid-cols-[minmax(180px,1fr)_repeat(4,auto)] items-center gap-4">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold uppercase text-slate-200">{sessionName}</p>
          <p className="text-[11px] uppercase text-slate-500">{sessionType}</p>
        </div>
        <StatusPill label="Live" tone="red" />
        <StatusPill label={socketStatus} tone={socketStatus === "connected" ? "green" : "amber"} />
        <Metric label="Lap" value={formatNumber(dashboard.timing.lap)} />
        <Metric label="Time" value={formatTime(dashboard.connection.lastUpdate)} />
      </div>

      <div className="ml-4 flex items-center gap-3">
        <Metric label="Last update" value={formatAge(dashboard.connection.lastMessageReceivedAt, now)} />
        <StatusPill label={dashboard.connection.isStale ? "Stale" : "Healthy"} tone={dashboard.connection.isStale ? "amber" : "green"} />
      </div>
    </header>
  );
}

function getFallbackSessionName(dataMode: DashboardState["connection"]["dataMode"]): string {
  if (dataMode === "mock") {
    return "Mock Grand Prix";
  }

  if (dataMode === "live") {
    return "Waiting for live session";
  }

  return "Connecting to session";
}

function getFallbackSessionType(dataMode: DashboardState["connection"]["dataMode"]): string {
  if (dataMode === "mock") {
    return "Race";
  }

  if (dataMode === "live") {
    return "Live mode";
  }

  return "Awaiting data mode";
}

function Metric({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div className="min-w-16 border-l border-slate-800 pl-3">
      <p className="text-[10px] font-semibold uppercase text-slate-500">{label}</p>
      <p className="font-mono text-sm tabular-nums text-slate-100">{value}</p>
    </div>
  );
}

function StatusPill({ label, tone }: { readonly label: string; readonly tone: "red" | "green" | "amber" }) {
  const toneClassName =
    tone === "red"
      ? "border-red-500/50 bg-red-500/10 text-red-300"
      : tone === "green"
        ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-300"
        : "border-amber-500/50 bg-amber-500/10 text-amber-300";

  return (
    <span className={`whitespace-nowrap border px-2 py-1 text-[10px] font-bold uppercase ${toneClassName}`}>
      {label}
    </span>
  );
}
