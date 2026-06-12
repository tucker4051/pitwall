import { getDriverIdentity } from "./driver-identity";
import { getTeamStripStyle } from "./team-colours";
import type { TimingTowerRow, TimingTowerRowsResult } from "./timing-tower-data";

type TimingTowerPanelProps = {
  readonly rowsResult: TimingTowerRowsResult;
  readonly selectedDriverKey: string;
  readonly onSelectDriver: (row: TimingTowerRow) => void;
};

export function TimingTowerPanel({ rowsResult, selectedDriverKey, onSelectDriver }: TimingTowerPanelProps) {
  const visibleDrivers = rowsResult.rows;
  const metadataPendingCount = visibleDrivers.filter((driver) => !driver.hasDriverMetadata).length;

  return (
    <section className="flex h-full min-h-0 flex-col border border-slate-800 bg-[#0b1119]">
      <div className="flex h-10 items-center justify-between border-b border-slate-800 px-3">
        <h2 className="text-[11px] font-bold uppercase text-slate-300">Timing tower</h2>
        <span className="font-mono text-[11px] text-slate-500">{visibleDrivers.length || "--"} cars</span>
      </div>

      <div className="grid grid-cols-[34px_1fr_72px] border-b border-slate-800 bg-[#090d13] px-2 py-1.5 text-[10px] font-bold uppercase text-slate-500">
        <span>Pos</span>
        <span>Drv</span>
        <span className="text-right">{rowsResult.timingColumnHeader}</span>
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        {visibleDrivers.length === 0 ? <TimingTowerEmptyState emptyState={rowsResult.emptyState} /> : null}
        {metadataPendingCount > 0 ? <MetadataPendingNote count={metadataPendingCount} /> : null}

        {visibleDrivers.map((driver) => {
          const selected = driver.rowKey === selectedDriverKey;
          const identity = getDriverIdentity(driver);

          return (
            <button
              key={driver.rowKey}
              type="button"
              onClick={() => onSelectDriver(driver)}
              className={`grid h-[27px] w-full grid-cols-[34px_1fr_72px] items-center border-b border-slate-900 px-2 text-left text-[11px] ${
                selected ? "bg-cyan-400/10 text-cyan-100" : "bg-transparent text-slate-300 hover:bg-slate-900"
              }`}
            >
              <span className="font-mono text-slate-500">{driver.displayPosition}</span>
              <span className="flex items-center gap-2 font-black">
                <span className="h-4 w-1 border" style={getTeamStripStyle(identity.teamProfile)} />
                {driver.displayLabel}
              </span>
              <span className="text-right font-mono text-[11px] tabular-nums text-slate-300">
                {driver.displayTimingValue}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function TimingTowerEmptyState({ emptyState }: { readonly emptyState: TimingTowerRowsResult["emptyState"] }) {
  const { title, detail } = getEmptyStateCopy(emptyState);

  return (
    <div className="m-3 border border-slate-800 bg-[#090d13] px-3 py-4">
      <p className="text-[11px] font-bold uppercase text-slate-300">{title}</p>
      <p className="mt-1 text-xs text-slate-500">{detail}</p>
    </div>
  );
}

function getEmptyStateCopy(emptyState: TimingTowerRowsResult["emptyState"]): {
  readonly title: string;
  readonly detail: string;
} {
  switch (emptyState) {
    case "no-active-meeting":
      return {
        title: "No active Grand Prix weekend",
        detail: "Waiting for OpenF1 meeting context."
      };
    case "no-live-session":
      return {
        title: "No live session currently taking place",
        detail: "Meeting context is available. Timing tower will populate when a session starts."
      };
    case "loading-session-drivers":
      return {
        title: "Loading session drivers",
        detail: "Session changed. Previous session rows have been cleared."
      };
    case "waiting-for-driver-metadata":
    case null:
      return {
        title: "Waiting for driver metadata",
        detail: "Session detected. Timing tower will populate when driver records arrive."
      };
  }
}

function MetadataPendingNote({ count }: { readonly count: number }) {
  return (
    <div className="border-b border-slate-900 bg-[#090d13] px-3 py-2">
      <p className="text-[10px] font-bold uppercase text-slate-500">
        Waiting for driver metadata / {count}
      </p>
    </div>
  );
}
