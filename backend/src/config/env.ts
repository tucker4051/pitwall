export type DataMode = "mock" | "live";

export type AppConfig = {
  readonly appName: string;
  readonly backendPort: number;
  readonly dataMode: DataMode;
  readonly nodeEnv: string;
  readonly openF1: {
    readonly username?: string;
    readonly password?: string;
  };
};

const DEFAULT_BACKEND_PORT = 3001;
const DEFAULT_APP_NAME = "PitWall";

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const dataMode = parseDataMode(env.DATA_MODE);

  return {
    appName: env.APP_NAME ?? DEFAULT_APP_NAME,
    backendPort: parsePort(env.BACKEND_PORT),
    dataMode,
    nodeEnv: env.NODE_ENV ?? "development",
    openF1: {
      username: normalizeOptionalValue(env.OPENF1_USERNAME),
      password: normalizeOptionalValue(env.OPENF1_PASSWORD)
    }
  };
}

function parsePort(value: string | undefined): number {
  if (!value) {
    return DEFAULT_BACKEND_PORT;
  }

  const parsed = Number.parseInt(value, 10);

  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 65535) {
    throw new Error("BACKEND_PORT must be an integer between 1 and 65535.");
  }

  return parsed;
}

function parseDataMode(value: string | undefined): DataMode {
  if (!value) {
    return "mock";
  }

  if (value === "mock" || value === "live") {
    return value;
  }

  throw new Error("DATA_MODE must be either 'mock' or 'live'.");
}

function normalizeOptionalValue(value: string | undefined): string | undefined {
  if (!value || value.startsWith("your_")) {
    return undefined;
  }

  return value;
}
