import { formatTime, getCompoundClassName } from "./format";
import type { DashboardDataMode, RaceControlMessage, TelemetrySnapshot, TyreStint, WeatherState } from "./types";

type RaceContextPanelProps = {
  readonly raceControlMessages: readonly RaceControlMessage[];
  readonly stints: readonly TyreStint[];
  readonly weather: WeatherState | null;
  readonly telemetry: readonly TelemetrySnapshot[];
  readonly dataMode: DashboardDataMode;
};

const FALLBACK_MESSAGES: readonly RaceControlMessage[] = [
  {
    id: "fallback-session",
    category: "session",
    message: "Mock session running normally.",
    receivedAt: new Date(0).toISOString()
  }
];

const contextGridClassName = "grid-cols-[minmax(260px,1.35fr)_minmax(170px,0.9fr)_minmax(190px,1fr)_minmax(190px,1fr)]";

export function RaceContextPanel({ raceControlMessages, stints, weather, telemetry, dataMode }: RaceContextPanelProps) {
  const visibleMessages = raceControlMessages.length > 0 ? raceControlMessages : dataMode === "mock" ? FALLBACK_MESSAGES : [];

  return (
    <section className="flex min-h-0 flex-col border border-slate-800 bg-[#0b1119]">
      <div className={`grid h-10 ${contextGridClassName} border-b border-slate-800 text-[11px] font-bold uppercase`}>
        <Tab active label="Race Control" />
        <Tab label="Tyres" />
        <Tab label="Weather" />
        <Tab label="Telemetry" />
      </div>

      <div className={`grid min-h-0 flex-1 ${contextGridClassName} gap-0 overflow-hidden`}>
        <div className="min-w-0 overflow-auto border-r border-slate-800">
          {visibleMessages.length === 0 ? <Empty label="No race-control messages yet" /> : null}
          {visibleMessages.slice(0, 7).map((message) => (
            <div key={message.id} className="grid grid-cols-[72px_72px_1fr] border-b border-slate-900 px-3 py-2 text-xs">
              <span className="font-mono text-slate-500">{formatTime(message.receivedAt)}</span>
              <span className={message.category === "flag" ? "font-bold uppercase text-amber-300" : "font-bold uppercase text-slate-400"}>
                {message.category}
              </span>
              <span className="truncate text-slate-200">{message.message}</span>
            </div>
          ))}
        </div>

        <div className="min-h-0 overflow-auto border-r border-slate-800 p-3">
          <PanelLabel label="Tyre Stints" />
          <div className="mt-2 space-y-1.5">
            {stints.slice(0, 5).map((stint) => (
              <div key={stint.driverNumber} className="grid grid-cols-[38px_1fr_34px] items-center gap-2 text-xs">
                <span className="font-mono text-slate-400">#{stint.driverNumber}</span>
                <span className={`min-w-0 border px-2 py-0.5 text-center text-[10px] font-bold uppercase ${getCompoundClassName(stint.compound)}`}>
                  {stint.compound}
                </span>
                <span className="text-right font-mono text-slate-300">{stint.stintAgeLaps}L</span>
              </div>
            ))}
            {stints.length === 0 ? <Empty label="No stint data yet" /> : null}
          </div>
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
          <PanelLabel label="Telemetry" />
          <div className="mt-2 space-y-2">
            {telemetry.slice(0, 4).map((snapshot) => (
              <div key={snapshot.driverNumber} className="grid grid-cols-[40px_minmax(64px,1fr)_44px] items-center gap-2 text-xs">
                <span className="font-mono text-slate-400">#{snapshot.driverNumber}</span>
                <div className="h-1.5 bg-slate-800">
                  <div className="h-full bg-cyan-300" style={{ width: `${Math.min(100, snapshot.throttle)}%` }} />
                </div>
                <span className="text-right font-mono text-slate-300">{snapshot.speed}</span>
              </div>
            ))}
            {telemetry.length === 0 ? <Empty label="No telemetry yet" /> : null}
          </div>
        </div>
      </div>
    </section>
  );
}

function Tab({ label, active = false }: { readonly label: string; readonly active?: boolean }) {
  return (
    <div className={`flex min-w-0 items-center border-r border-slate-800 px-3 ${active ? "bg-red-950/60 text-red-300" : "bg-[#111925] text-slate-500"}`}>
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

function Empty({ label }: { readonly label: string }) {
  return <p className="border border-slate-800 bg-[#090d13] px-2 py-2 text-xs text-slate-500">{label}</p>;
}
