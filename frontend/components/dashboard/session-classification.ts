export type SessionKind = "race" | "qualifying" | "timed" | "unknown";

export function classifySessionKind(...sessionLabels: ReadonlyArray<string | null | undefined>): SessionKind {
  const labels = sessionLabels
    .filter((value): value is string => Boolean(value))
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);

  if (labels.length === 0) {
    return "unknown";
  }

  if (labels.some(isQualifyingStyleLabel)) {
    return "qualifying";
  }

  if (labels.some((label) => label.includes("race") || label === "sprint")) {
    return "race";
  }

  if (labels.some((label) => label.includes("practice"))) {
    return "timed";
  }

  return "unknown";
}

export function isQualifyingStyleSession(...sessionLabels: ReadonlyArray<string | null | undefined>): boolean {
  return classifySessionKind(...sessionLabels) === "qualifying";
}

function isQualifyingStyleLabel(label: string): boolean {
  return label.includes("qualifying") || label.includes("shootout") || label === "quali" || label === "sq";
}
