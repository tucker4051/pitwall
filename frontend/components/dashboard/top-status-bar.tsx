import { formatAge, formatNumber } from "./format";
import type { ConnectionStatus, DashboardState } from "./types";

type TopStatusBarProps = {
  readonly dashboard: DashboardState;
  readonly socketStatus: ConnectionStatus;
  readonly now: number;
};

export function TopStatusBar({ dashboard, socketStatus, now }: TopStatusBarProps) {
  const effectiveNow = now;
  const sessionName =
    dashboard.meeting.name ??
    dashboard.session.name ??
    dashboard.connection.sessionName ??
    getFallbackSessionName(dashboard.connection.dataMode);
  const sessionType = dashboard.session.type ?? dashboard.connection.sessionType ?? getFallbackSessionType(dashboard.connection.dataMode);
  const sessionClass = classifySessionType(sessionType);
  const meetingStatus = getMeetingStatus(dashboard.meeting.dateStart, dashboard.meeting.dateEnd, effectiveNow);
  const trackTime = formatTrackTime(effectiveNow, dashboard.meeting.gmtOffset);
  const sessionCountdown = getSessionCountdown(dashboard.session.dateEnd, effectiveNow);
  const contextDetail = dashboard.session.name
    ? `${dashboard.session.name}${dashboard.meeting.circuitShortName ? ` / ${dashboard.meeting.circuitShortName}` : ""}`
    : sessionType;
  const shouldShowLap = sessionClass === "race";
  const shouldShowCountdown = sessionClass === "timed";

  // TODO: Add backend meeting transition detection so a new valid OpenF1 meeting_key can switch Grand Prix context automatically.
  // TODO: Handle Q1/Q2/Q3 segment timing once a reliable OpenF1 source for phase timing is identified.

  return (
    <header className="grid h-16 shrink-0 grid-cols-[220px_1fr_auto] items-center border-b border-slate-800 bg-[#080b10] px-4">
      <div className="flex items-center gap-3">
        <div className="h-8 w-1 bg-red-500" />
        <div>
          <p className="text-lg font-black uppercase text-slate-100">PitWall</p>
          <p className="text-[10px] font-semibold uppercase text-slate-500">Race Companion</p>
        </div>
      </div>

      <div className="grid min-w-0 grid-cols-[minmax(180px,1fr)_repeat(5,auto)] items-center gap-4">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold uppercase text-slate-200">{sessionName}</p>
          <p className="truncate text-[11px] uppercase text-slate-500">{contextDetail}</p>
        </div>
        <StatusPill label={meetingStatus.label} tone={meetingStatus.tone} />
        <StatusPill label={socketStatus} tone={socketStatus === "connected" ? "green" : "amber"} />
        <Metric label="My time" value={formatLocalTime(effectiveNow)} />
        <Metric label="Track time" value={trackTime} />
        {shouldShowLap ? <Metric label="Lap" value={formatNumber(dashboard.timing.lap)} /> : null}
        {shouldShowCountdown ? <Metric label="Session left" value={sessionCountdown} /> : null}
      </div>

      <div className="ml-4 flex items-center gap-3">
        <Metric label="Last update" value={formatAge(dashboard.connection.lastMessageReceivedAt, effectiveNow)} />
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

type SessionClass = "race" | "timed" | "unknown";

function classifySessionType(sessionType: string | null | undefined): SessionClass {
  if (!sessionType) {
    return "unknown";
  }

  const normalized = sessionType.toLowerCase();

  if (normalized.includes("race") || normalized === "sprint") {
    return "race";
  }

  if (
    normalized.includes("practice") ||
    normalized.includes("qualifying") ||
    normalized.includes("shootout")
  ) {
    return "timed";
  }

  return "unknown";
}

function getMeetingStatus(
  dateStart: string | null,
  dateEnd: string | null,
  now: number
): { readonly label: string; readonly tone: "red" | "green" | "amber" | "slate" } {
  const startTime = parseTimestamp(dateStart);
  const endTime = parseTimestamp(dateEnd);

  if (startTime === null || endTime === null) {
    return { label: "Meeting unknown", tone: "slate" };
  }

  if (now < startTime) {
    return { label: "Upcoming", tone: "amber" };
  }

  if (now > endTime) {
    return { label: "No active Grand Prix", tone: "slate" };
  }

  return { label: "Live weekend", tone: "red" };
}

function parseTimestamp(value: string | null): number | null {
  if (!value) {
    return null;
  }

  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : parsed;
}

function formatClockTime(timestamp: number): string {
  const date = new Date(timestamp);

  return [date.getUTCHours(), date.getUTCMinutes(), date.getUTCSeconds()]
    .map((value) => String(value).padStart(2, "0"))
    .join(":");
}

function formatLocalTime(timestamp: number): string {
  const date = new Date(timestamp);

  return [date.getHours(), date.getMinutes(), date.getSeconds()]
    .map((value) => String(value).padStart(2, "0"))
    .join(":");
}

function formatTrackTime(now: number, gmtOffset: string | null): string {
  const offsetMinutes = parseGmtOffset(gmtOffset);

  if (offsetMinutes === null) {
    return "--:--:--";
  }

  return formatClockTime(now + offsetMinutes * 60_000);
}

function parseGmtOffset(gmtOffset: string | null): number | null {
  if (!gmtOffset) {
    return null;
  }

  const match = /^([+-])?(\d{1,2})(?::?(\d{2}))?(?::?(\d{2}))?$/.exec(gmtOffset.trim());

  if (!match) {
    return null;
  }

  const sign = match[1] === "-" ? -1 : 1;
  const hours = Number(match[2]);
  const minutes = Number(match[3] ?? "0");
  const seconds = Number(match[4] ?? "0");

  if (
    !Number.isFinite(hours) ||
    !Number.isFinite(minutes) ||
    !Number.isFinite(seconds) ||
    minutes > 59 ||
    seconds > 59
  ) {
    return null;
  }

  return sign * (hours * 60 + minutes + Math.round(seconds / 60));
}

function getSessionCountdown(dateEnd: string | null, now: number): string {
  const endTime = parseTimestamp(dateEnd);

  if (endTime === null) {
    return "--:--";
  }

  const remainingSeconds = Math.floor((endTime - now) / 1_000);

  if (remainingSeconds <= 0) {
    return "Ended";
  }

  return formatDuration(remainingSeconds);
}

function formatDuration(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3_600);
  const minutes = Math.floor((totalSeconds % 3_600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function Metric({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div className="min-w-16 border-l border-slate-800 pl-3">
      <p className="text-[10px] font-semibold uppercase text-slate-500">{label}</p>
      <p className="font-mono text-sm tabular-nums text-slate-100">{value}</p>
    </div>
  );
}

function StatusPill({ label, tone }: { readonly label: string; readonly tone: "red" | "green" | "amber" | "slate" }) {
  const toneClassName =
    tone === "red"
      ? "border-red-500/50 bg-red-500/10 text-red-300"
      : tone === "green"
        ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-300"
        : tone === "amber"
          ? "border-amber-500/50 bg-amber-500/10 text-amber-300"
          : "border-slate-600/60 bg-slate-700/10 text-slate-400";

  return (
    <span className={`whitespace-nowrap border px-2 py-1 text-[10px] font-bold uppercase ${toneClassName}`}>
      {label}
    </span>
  );
}
