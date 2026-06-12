import { getDriverIdentity } from "./driver-identity";
import { getTeamStripStyle } from "./team-colours";
import type { TimingTowerRow, TimingTowerRowsResult } from "./timing-tower-data";
import type { TimingDriver, TyreStint } from "./types";

type TimingTowerPanelProps = {
  readonly rowsResult: TimingTowerRowsResult;
  readonly stints: readonly TyreStint[];
  readonly selectedDriverKey: string;
  readonly onSelectDriver: (row: TimingTowerRow) => void;
};

export function TimingTowerPanel({ rowsResult, stints, selectedDriverKey, onSelectDriver }: TimingTowerPanelProps) {
  const visibleDrivers = rowsResult.rows;

  return (
    <section className="flex h-full min-h-0 flex-col border border-slate-800 bg-[#0b1119]">
      <div className="flex h-10 items-center justify-between border-b border-slate-800 px-3">
        <h2 className="text-[11px] font-bold uppercase text-slate-300">Timing tower</h2>
        <span className="font-mono text-[11px] text-slate-500">{visibleDrivers.length || "--"} cars</span>
      </div>

      <div className="grid grid-cols-[30px_48px_1fr_62px_62px] border-b border-slate-800 bg-[#090d13] px-2 py-1.5 text-[10px] font-bold uppercase text-slate-500">
        <span>Pos</span>
        <span>Drv</span>
        <span>Tyre</span>
        <span className="text-right">Gap</span>
        <span className="text-right">Int</span>
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        {visibleDrivers.length === 0 ? <TimingTowerEmptyState emptyState={rowsResult.emptyState} /> : null}

        {visibleDrivers.map((driver) => {
          const selected = driver.rowKey === selectedDriverKey;
          const stint = findStint(stints, driver);
          const identity = getDriverIdentity(driver);

          return (
            <button
              key={driver.rowKey}
              type="button"
              onClick={() => onSelectDriver(driver)}
              className={`grid h-[27px] w-full grid-cols-[30px_48px_1fr_62px_62px] items-center border-b border-slate-900 px-2 text-left text-[11px] ${
                selected ? "bg-cyan-400/10 text-cyan-100" : "bg-transparent text-slate-300 hover:bg-slate-900"
              }`}
            >
              <span className="font-mono text-slate-500">{driver.displayPosition}</span>
              <span className="flex items-center gap-2 font-black">
                <span className="h-4 w-1 border" style={getTeamStripStyle(identity.teamProfile)} />
                {driver.abbreviation}
              </span>
              <span className="font-mono text-[11px] uppercase text-slate-400">
                {stint ? `${stint.compound.slice(0, 3)} ${stint.stintAgeLaps}L` : "--"}
              </span>
              <span className="text-right font-mono tabular-nums text-slate-300">{driver.gapToLeader || "--"}</span>
              <span className="text-right font-mono tabular-nums text-slate-400">{driver.intervalToAhead ?? "--"}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function findStint(stints: readonly TyreStint[], driver: TimingDriver): TyreStint | undefined {
  if (driver.driverNumber) {
    return stints.find((stint) => stint.driverNumber === driver.driverNumber);
  }

  return stints[driver.position - 1];
}

function TimingTowerEmptyState({ emptyState }: { readonly emptyState: TimingTowerRowsResult["emptyState"] }) {
  const title = emptyState === "waiting-for-driver-data" ? "Waiting for driver data" : "No active session";
  const detail =
    emptyState === "waiting-for-driver-data"
      ? "Session detected. Timing tower will populate when driver records arrive."
      : "Live mode is connected, but no current session drivers are available.";

  return (
    <div className="m-3 border border-slate-800 bg-[#090d13] px-3 py-4">
      <p className="text-[11px] font-bold uppercase text-slate-300">{title}</p>
      <p className="mt-1 text-xs text-slate-500">{detail}</p>
    </div>
  );
}
