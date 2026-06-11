export function formatAge(timestamp: string | null, now: number): string {
  if (!timestamp) {
    return "--";
  }

  const elapsedSeconds = Math.max(0, Math.floor((now - Date.parse(timestamp)) / 1_000));

  if (elapsedSeconds < 60) {
    return `${elapsedSeconds}s`;
  }

  return `${Math.floor(elapsedSeconds / 60)}m ${elapsedSeconds % 60}s`;
}

export function formatTime(timestamp: string | null): string {
  if (!timestamp) {
    return "--:--:--";
  }

  const date = new Date(timestamp);

  return [date.getUTCHours(), date.getUTCMinutes(), date.getUTCSeconds()].map((value) => String(value).padStart(2, "0")).join(":");
}

export function formatNumber(value: number | null | undefined, fallback = "--"): string {
  return typeof value === "number" && Number.isFinite(value) ? String(value) : fallback;
}

export function getCompoundClassName(compound: string | undefined): string {
  switch (compound) {
    case "soft":
      return "border-red-500/40 bg-red-500/10 text-red-300";
    case "medium":
      return "border-amber-400/40 bg-amber-400/10 text-amber-200";
    case "hard":
      return "border-slate-300/40 bg-slate-300/10 text-slate-100";
    case "intermediate":
      return "border-emerald-400/40 bg-emerald-400/10 text-emerald-200";
    case "wet":
      return "border-sky-400/40 bg-sky-400/10 text-sky-200";
    default:
      return "border-slate-700 bg-slate-900 text-slate-400";
  }
}

export function normaliseCoordinate(value: number): number {
  if (!Number.isFinite(value)) {
    return 50;
  }

  const wrapped = ((value % 100) + 100) % 100;
  return Math.max(5, Math.min(95, wrapped));
}
