import { normaliseCoordinate } from "./format";
import type { TimingDriver, TrackPosition } from "./types";

type TrackMapPanelProps = {
  readonly positions: readonly TrackPosition[];
  readonly drivers: readonly TimingDriver[];
  readonly selectedDriver: string;
};

const FALLBACK_POSITIONS: readonly TrackPosition[] = [
  { abbreviation: "VER", x: 18, y: 34, z: 0, updatedAt: "" },
  { abbreviation: "NOR", x: 44, y: 60, z: 0, updatedAt: "" },
  { abbreviation: "LEC", x: 72, y: 40, z: 0, updatedAt: "" },
  { abbreviation: "PIA", x: 62, y: 23, z: 0, updatedAt: "" },
  { abbreviation: "RUS", x: 28, y: 70, z: 0, updatedAt: "" },
  { abbreviation: "HAM", x: 82, y: 66, z: 0, updatedAt: "" }
];

export function TrackMapPanel({ positions, drivers, selectedDriver }: TrackMapPanelProps) {
  const visiblePositions = positions.length > 0 ? positions : FALLBACK_POSITIONS;

  return (
    <section className="relative min-h-0 overflow-hidden border border-slate-800 bg-[#080d14]">
      <div className="absolute inset-x-0 top-0 z-10 flex h-10 items-center justify-between border-b border-slate-800 bg-[#0b1119]/95 px-3">
        <h2 className="text-[11px] font-bold uppercase text-slate-300">Live track map · Silverstone</h2>
        <span className="font-mono text-[11px] text-slate-500">Abstract circuit</span>
      </div>

      <div className="absolute inset-0 top-10">
        <div className="absolute inset-0 bg-[linear-gradient(#1f2b3a33_1px,transparent_1px),linear-gradient(90deg,#1f2b3a33_1px,transparent_1px)] bg-[size:32px_32px]" />
        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <path
            d="M14 56 C13 24 40 12 64 21 C88 30 92 58 77 76 C61 94 27 87 20 68 C15 55 30 40 45 45 C62 50 66 66 54 76"
            fill="none"
            stroke="#263445"
            strokeWidth="8"
            strokeLinecap="round"
          />
          <path
            d="M14 56 C13 24 40 12 64 21 C88 30 92 58 77 76 C61 94 27 87 20 68 C15 55 30 40 45 45 C62 50 66 66 54 76"
            fill="none"
            stroke="#94a3b8"
            strokeOpacity="0.7"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
          <path d="M14 56 C13 24 40 12 64 21" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" />
        </svg>

        {visiblePositions.map((position) => {
          const abbreviation = resolveAbbreviation(position, drivers);
          const selected = abbreviation === selectedDriver;

          return (
            <div
              key={`${position.abbreviation}-${position.updatedAt}`}
              className="absolute -translate-x-1/2 -translate-y-1/2"
              style={{
                left: `${normaliseCoordinate(position.x)}%`,
                top: `${normaliseCoordinate(position.y)}%`
              }}
            >
              <div
                className={`flex h-7 min-w-9 items-center justify-center border px-2 font-mono text-[11px] font-black ${
                  selected
                    ? "border-cyan-300 bg-cyan-300/15 text-cyan-100 ring-2 ring-cyan-300/40"
                    : "border-slate-500 bg-[#101826] text-slate-200"
                }`}
              >
                {abbreviation}
              </div>
            </div>
          );
        })}

        <div className="absolute bottom-3 left-3 grid grid-cols-3 gap-2 text-[10px] uppercase text-slate-500">
          <span className="border border-slate-800 bg-[#0b1119] px-2 py-1">Sector 1</span>
          <span className="border border-slate-800 bg-[#0b1119] px-2 py-1">Sector 2</span>
          <span className="border border-emerald-500/40 bg-emerald-500/10 px-2 py-1 text-emerald-300">Green</span>
        </div>
      </div>
    </section>
  );
}

function resolveAbbreviation(position: TrackPosition, drivers: readonly TimingDriver[]): string {
  const numericDriver = Number(position.abbreviation);

  if (Number.isFinite(numericDriver)) {
    return drivers.find((driver) => driver.driverNumber === numericDriver)?.abbreviation ?? position.abbreviation;
  }

  return position.abbreviation;
}
