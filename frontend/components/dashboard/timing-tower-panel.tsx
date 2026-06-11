import type { TimingDriver, TyreStint } from "./types";

type TimingTowerPanelProps = {
  readonly drivers: readonly TimingDriver[];
  readonly stints: readonly TyreStint[];
  readonly selectedDriver: string;
  readonly onSelectDriver: (abbreviation: string) => void;
};

const FALLBACK_DRIVERS: readonly TimingDriver[] = [
  { position: 1, driverNumber: 1, abbreviation: "VER", fullName: "Max Verstappen", teamName: "Red Bull Racing", gapToLeader: "LEADER", intervalToAhead: "--" },
  { position: 2, driverNumber: 4, abbreviation: "NOR", fullName: "Lando Norris", teamName: "McLaren", gapToLeader: "+1.234", intervalToAhead: "+1.234" },
  { position: 3, driverNumber: 16, abbreviation: "LEC", fullName: "Charles Leclerc", teamName: "Ferrari", gapToLeader: "+2.468", intervalToAhead: "+1.234" },
  { position: 4, driverNumber: 81, abbreviation: "PIA", fullName: "Oscar Piastri", teamName: "McLaren", gapToLeader: "+4.112", intervalToAhead: "+1.644" },
  { position: 5, driverNumber: 55, abbreviation: "SAI", fullName: "Carlos Sainz", teamName: "Williams", gapToLeader: "+5.807", intervalToAhead: "+1.695" },
  { position: 6, driverNumber: 63, abbreviation: "RUS", fullName: "George Russell", teamName: "Mercedes", gapToLeader: "+7.033", intervalToAhead: "+1.226" },
  { position: 7, driverNumber: 44, abbreviation: "HAM", fullName: "Lewis Hamilton", teamName: "Ferrari", gapToLeader: "+8.540", intervalToAhead: "+1.507" },
  { position: 8, driverNumber: 14, abbreviation: "ALO", fullName: "Fernando Alonso", teamName: "Aston Martin", gapToLeader: "+10.120", intervalToAhead: "+1.580" },
  { position: 9, driverNumber: 18, abbreviation: "STR", fullName: "Lance Stroll", teamName: "Aston Martin", gapToLeader: "+12.408", intervalToAhead: "+2.288" },
  { position: 10, driverNumber: 23, abbreviation: "ALB", fullName: "Alexander Albon", teamName: "Williams", gapToLeader: "+14.002", intervalToAhead: "+1.594" },
  { position: 11, driverNumber: 31, abbreviation: "OCO", fullName: "Esteban Ocon", teamName: "Haas", gapToLeader: "+15.421", intervalToAhead: "+1.419" },
  { position: 12, driverNumber: 10, abbreviation: "GAS", fullName: "Pierre Gasly", teamName: "Alpine", gapToLeader: "+16.903", intervalToAhead: "+1.482" },
  { position: 13, driverNumber: 22, abbreviation: "TSU", fullName: "Yuki Tsunoda", teamName: "Red Bull Racing", gapToLeader: "+18.771", intervalToAhead: "+1.868" },
  { position: 14, driverNumber: 27, abbreviation: "HUL", fullName: "Nico Hulkenberg", teamName: "Sauber", gapToLeader: "+20.034", intervalToAhead: "+1.263" },
  { position: 15, driverNumber: 30, abbreviation: "LAW", fullName: "Liam Lawson", teamName: "Racing Bulls", gapToLeader: "+21.806", intervalToAhead: "+1.772" },
  { position: 16, driverNumber: 6, abbreviation: "HAD", fullName: "Isack Hadjar", teamName: "Racing Bulls", gapToLeader: "+23.552", intervalToAhead: "+1.746" },
  { position: 17, driverNumber: 87, abbreviation: "BEA", fullName: "Oliver Bearman", teamName: "Haas", gapToLeader: "+25.340", intervalToAhead: "+1.788" },
  { position: 18, driverNumber: 12, abbreviation: "ANT", fullName: "Andrea Kimi Antonelli", teamName: "Mercedes", gapToLeader: "+27.118", intervalToAhead: "+1.778" },
  { position: 19, driverNumber: 5, abbreviation: "BOR", fullName: "Gabriel Bortoleto", teamName: "Sauber", gapToLeader: "+29.004", intervalToAhead: "+1.886" },
  { position: 20, driverNumber: 43, abbreviation: "COL", fullName: "Franco Colapinto", teamName: "Alpine", gapToLeader: "+31.220", intervalToAhead: "+2.216" },
  { position: 21, driverNumber: 11, abbreviation: "PER", fullName: "Sergio Perez", teamName: "Cadillac", gapToLeader: "+33.900", intervalToAhead: "+2.680" },
  { position: 22, driverNumber: 77, abbreviation: "BOT", fullName: "Valtteri Bottas", teamName: "Cadillac", gapToLeader: "+36.500", intervalToAhead: "+2.600" }
];

const TEAM_ACCENTS = ["bg-cyan-400", "bg-orange-500", "bg-red-500", "bg-emerald-400", "bg-amber-300"];

export function TimingTowerPanel({ drivers, stints, selectedDriver, onSelectDriver }: TimingTowerPanelProps) {
  const visibleDrivers = createTwentyTwoDriverField(drivers);

  return (
    <section className="flex h-full min-h-0 flex-col border border-slate-800 bg-[#0b1119]">
      <div className="flex h-10 items-center justify-between border-b border-slate-800 px-3">
        <h2 className="text-[11px] font-bold uppercase text-slate-300">Timing tower</h2>
        <span className="font-mono text-[11px] text-slate-500">{visibleDrivers.length} cars</span>
      </div>

      <div className="grid grid-cols-[30px_48px_1fr_62px_62px] border-b border-slate-800 bg-[#090d13] px-2 py-1.5 text-[10px] font-bold uppercase text-slate-500">
        <span>Pos</span>
        <span>Drv</span>
        <span>Tyre</span>
        <span className="text-right">Gap</span>
        <span className="text-right">Int</span>
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        {visibleDrivers.map((driver, index) => {
          const selected = driver.abbreviation === selectedDriver;
          const stint = findStint(stints, driver);

          return (
            <button
              key={`${driver.position}-${driver.abbreviation}`}
              type="button"
              onClick={() => onSelectDriver(driver.abbreviation)}
              className={`grid h-[27px] w-full grid-cols-[30px_48px_1fr_62px_62px] items-center border-b border-slate-900 px-2 text-left text-[11px] ${
                selected ? "bg-cyan-400/10 text-cyan-100" : "bg-transparent text-slate-300 hover:bg-slate-900"
              }`}
            >
              <span className="font-mono text-slate-500">{driver.position}</span>
              <span className="flex items-center gap-2 font-black">
                <span className={`h-4 w-1 ${TEAM_ACCENTS[index % TEAM_ACCENTS.length]}`} />
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

function createTwentyTwoDriverField(drivers: readonly TimingDriver[]): readonly TimingDriver[] {
  const driversByAbbreviation = new Map(drivers.map((driver) => [driver.abbreviation, driver]));

  return FALLBACK_DRIVERS.map((fallbackDriver) => ({
    ...fallbackDriver,
    ...driversByAbbreviation.get(fallbackDriver.abbreviation),
    gapToLeader: driversByAbbreviation.get(fallbackDriver.abbreviation)?.gapToLeader ?? fallbackDriver.gapToLeader,
    intervalToAhead: driversByAbbreviation.get(fallbackDriver.abbreviation)?.intervalToAhead ?? fallbackDriver.intervalToAhead
  }));
}

function findStint(stints: readonly TyreStint[], driver: TimingDriver): TyreStint | undefined {
  if (driver.driverNumber) {
    return stints.find((stint) => stint.driverNumber === driver.driverNumber);
  }

  return stints[driver.position - 1];
}
