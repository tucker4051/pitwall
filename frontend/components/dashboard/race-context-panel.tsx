import { formatNumber, formatTime } from "./format";
import { classifySessionKind } from "./session-classification";
import type { DashboardDataMode, MeetingState, RaceControlMessage, SessionState, WeatherState } from "./types";

type RaceContextPanelProps = {
  readonly raceControlMessages: readonly RaceControlMessage[];
  readonly weather: WeatherState | null;
  readonly meeting: MeetingState;
  readonly session: SessionState;
  readonly lap: number | null;
  readonly driverCount: number;
  readonly dataMode: DashboardDataMode;
  readonly now: number;
};

const FALLBACK_MESSAGES: readonly RaceControlMessage[] = [
  {
    id: "fallback-session",
    category: "session",
    message: "Mock session running normally.",
    receivedAt: new Date(0).toISOString()
  }
];

const contextGridClassName = "grid-cols-[minmax(360px,2fr)_minmax(190px,1fr)_minmax(190px,1fr)]";

export function RaceContextPanel({ raceControlMessages, weather, meeting, session, lap, driverCount, dataMode, now }: RaceContextPanelProps) {
  const visibleMessages = raceControlMessages.length > 0 ? raceControlMessages : dataMode === "mock" ? FALLBACK_MESSAGES : [];
  const sessionClass = classifySessionKind(session.type, session.name);
  const sessionStatus = getSessionStatus(session.dateStart, session.dateEnd, now);

  return (
    <section className="flex min-h-0 flex-col border border-slate-800 bg-[#0b1119]">
      <div className={`grid h-10 ${contextGridClassName} border-b border-slate-800 text-[11px] font-bold uppercase`}>
        <Tab label="Race Control" />
        <Tab label="Weather" />
        <Tab label="Session Info" />
      </div>

      <div className={`grid min-h-0 flex-1 ${contextGridClassName} gap-0 overflow-hidden`}>
        <div className="min-w-0 overflow-auto border-r border-slate-800">
          {visibleMessages.length === 0 ? <Empty label="No race-control messages yet" /> : null}
          {visibleMessages.slice(0, 7).map((message) => (
            <div key={message.id} className="grid grid-cols-[72px_72px_minmax(0,1fr)] gap-2 border-b border-slate-900 px-3 py-2 text-xs">
              <span className="font-mono text-slate-500">{formatTime(message.receivedAt)}</span>
              <span className={message.category === "flag" ? "font-bold uppercase text-amber-300" : "font-bold uppercase text-slate-400"}>
                {message.category}
              </span>
              <span className="min-w-0 whitespace-normal break-words text-slate-200">{message.message}</span>
            </div>
          ))}
        </div>

        <div className="min-h-0 overflow-auto border-r border-slate-800 p-3">
          <PanelLabel label="Weather" />
          <div className="mt-2 grid grid-cols-2 gap-1.5 text-xs">
            <WeatherMetric label="Air" value={weather ? `${weather.airTemperature}C` : "--"} />
            <WeatherMetric label="Track" value={weather ? `${weather.trackTemperature}C` : "--"} />
            <WeatherMetric label="Humidity" value={weather ? `${weather.humidity}%` : "--"} />
            <WeatherMetric label="Rain" value={weather ? `${weather.rainfall}` : "--"} />
            <WeatherMetric label="Wind" value={weather ? `${weather.windSpeed}` : "--"} />
            <WeatherMetric label="Dir" value={weather ? `${weather.windDirection}` : "--"} />
          </div>
          {weather ? null : <div className="mt-2"><Empty label="No weather data yet" /></div>}
        </div>

        <div className="min-h-0 overflow-auto p-3">
          <PanelLabel label="Session Info" />
          <div className="mt-2 space-y-1.5">
            <InfoRow label="Type" value={session.name ?? session.type ?? "--"} />
            <InfoRow label="Status" value={sessionStatus} />
            {sessionClass === "qualifying" ? <InfoRow label="Phase" value={formatQualifyingPhase(session.qualifyingPhase)} /> : null}
            {sessionClass === "race" ? <InfoRow label="Lap" value={lap ? formatNumber(lap) : "--"} /> : null}
            <InfoRow label="Cars" value={driverCount > 0 ? formatNumber(driverCount) : "--"} />
            <InfoRow label="Circuit" value={meeting.circuitShortName ?? "--"} />
          </div>
        </div>
      </div>
    </section>
  );
}

function Tab({ label }: { readonly label: string }) {
  return (
    <div className="flex min-w-0 items-center border-r border-slate-800 bg-[#111925] px-3 text-slate-400">
      {label}
    </div>
  );
}

function PanelLabel({ label }: { readonly label: string }) {
  return <p className="text-[10px] font-bold uppercase text-slate-500">{label}</p>;
}

function WeatherMetric({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div className="min-w-0 border border-slate-800 bg-[#090d13] px-2 py-1.5">
      <p className="text-[10px] uppercase text-slate-500">{label}</p>
      <p className="font-mono text-sm text-slate-200">{value}</p>
    </div>
  );
}

function InfoRow({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border border-slate-800 bg-[#090d13] px-2 py-1.5 text-xs">
      <span className="font-bold uppercase text-slate-500">{label}</span>
      <span className="min-w-0 truncate text-right font-mono text-slate-200">{value}</span>
    </div>
  );
}

function Empty({ label }: { readonly label: string }) {
  return <p className="border border-slate-800 bg-[#090d13] px-2 py-2 text-xs text-slate-500">{label}</p>;
}

function formatQualifyingPhase(phase: SessionState["qualifyingPhase"]): string {
  return phase ? `Q${phase}` : "--";
}

function getSessionStatus(dateStart: string | null, dateEnd: string | null, now: number): string {
  const startTime = parseTimestamp(dateStart);
  const endTime = parseTimestamp(dateEnd);

  if (startTime === null || endTime === null) {
    return "Unknown";
  }

  if (now < startTime) {
    return "Upcoming";
  }

  if (now > endTime) {
    return "Ended";
  }

  return "Live";
}

function parseTimestamp(value: string | null): number | null {
  if (!value) {
    return null;
  }

  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : parsed;
}
