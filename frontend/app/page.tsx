const placeholderPanels = [
  "Timing tower",
  "Track map",
  "Driver focus",
  "Race control",
  "Weather",
  "Tyres and stints"
];

export default function Home() {
  return (
    <main className="min-h-screen bg-[#080b10] text-slate-100">
      <section className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-6 px-6 py-6">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <p className="text-sm font-medium uppercase tracking-normal text-red-400">PitWall</p>
            <h1 className="mt-2 text-3xl font-semibold">Live race dashboard foundation</h1>
          </div>
          <div className="rounded border border-slate-700 px-3 py-2 text-sm text-slate-300">
            Stage 1 placeholder
          </div>
        </header>

        <div className="grid flex-1 gap-4 lg:grid-cols-[280px_1fr_320px]">
          <aside className="rounded border border-slate-800 bg-slate-950 p-4">
            <h2 className="text-sm font-semibold uppercase tracking-normal text-slate-400">Timing tower</h2>
            <div className="mt-4 space-y-3">
              {["P1", "P2", "P3", "P4", "P5"].map((position) => (
                <div key={position} className="flex items-center justify-between border-b border-slate-900 pb-2">
                  <span className="font-mono text-sm text-slate-400">{position}</span>
                  <span className="h-3 w-20 rounded-sm bg-slate-800" />
                </div>
              ))}
            </div>
          </aside>

          <section className="flex min-h-[420px] items-center justify-center rounded border border-slate-800 bg-slate-950 p-6">
            <div className="text-center">
              <p className="text-sm uppercase tracking-normal text-slate-500">Track map</p>
              <div className="mt-5 h-48 w-72 rounded-full border-2 border-dashed border-slate-700" />
            </div>
          </section>

          <aside className="rounded border border-slate-800 bg-slate-950 p-4">
            <h2 className="text-sm font-semibold uppercase tracking-normal text-slate-400">Driver focus</h2>
            <p className="mt-4 text-sm leading-6 text-slate-300">
              This placeholder reserves the dashboard surface. Live data wiring comes later.
            </p>
          </aside>
        </div>

        <section className="grid gap-4 md:grid-cols-3">
          {placeholderPanels.map((panel) => (
            <div key={panel} className="rounded border border-slate-800 bg-slate-950 p-4">
              <h2 className="text-sm font-semibold text-slate-300">{panel}</h2>
              <div className="mt-4 h-16 rounded bg-slate-900" />
            </div>
          ))}
        </section>
      </section>
    </main>
  );
}
