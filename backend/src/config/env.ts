export type DataMode = "mock" | "live";

export type AppConfig = {
  readonly appName: string;
  readonly backendPort: number;
  readonly dataMode: DataMode;
  readonly nodeEnv: string;
  readonly openF1: {
    readonly username?: string;
    readonly password?: string;
    readonly tokenUrl: string;
    readonly mqttHost: string;
    readonly mqttPort: number;
    readonly mqttClientUsername?: string;
    readonly mqttWebSocketUrl: string;
  };
};

const DEFAULT_BACKEND_PORT = 3001;
const DEFAULT_APP_NAME = "PitWall";
const DEFAULT_OPENF1_TOKEN_URL = "https://api.openf1.org/token";
const DEFAULT_OPENF1_MQTT_HOST = "mqtt.openf1.org";
const DEFAULT_OPENF1_MQTT_PORT = 8883;
const DEFAULT_OPENF1_MQTT_WS_URL = "wss://mqtt.openf1.org:8084/mqtt";

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const dataMode = parseDataMode(env.DATA_MODE);
  const openF1 = {
    username: normalizeOptionalValue(env.OPENF1_USERNAME),
    password: normalizeOptionalValue(env.OPENF1_PASSWORD),
    tokenUrl: env.OPENF1_TOKEN_URL ?? DEFAULT_OPENF1_TOKEN_URL,
    mqttHost: env.OPENF1_MQTT_HOST ?? DEFAULT_OPENF1_MQTT_HOST,
    mqttPort: parsePort(env.OPENF1_MQTT_PORT, "OPENF1_MQTT_PORT", DEFAULT_OPENF1_MQTT_PORT),
    mqttClientUsername: normalizeOptionalValue(env.OPENF1_MQTT_CLIENT_USERNAME),
    mqttWebSocketUrl: env.OPENF1_MQTT_WS_URL ?? DEFAULT_OPENF1_MQTT_WS_URL
  };

  if (dataMode === "live") {
    validateLiveOpenF1Config(openF1);
  }

  return {
    appName: env.APP_NAME ?? DEFAULT_APP_NAME,
    backendPort: parsePort(env.BACKEND_PORT, "BACKEND_PORT", DEFAULT_BACKEND_PORT),
    dataMode,
    nodeEnv: env.NODE_ENV ?? "development",
    openF1
  };
}

type OpenF1EnvConfig = AppConfig["openF1"];

function parsePort(value: string | undefined, name: string, defaultPort: number): number {
  if (!value) {
    return defaultPort;
  }

  const parsed = Number.parseInt(value, 10);

  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 65535) {
    throw new Error(`${name} must be an integer between 1 and 65535.`);
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
  if (!value || value.startsWith("your_") || value.endsWith("_here")) {
    return undefined;
  }

  return value;
}

function validateLiveOpenF1Config(config: OpenF1EnvConfig): void {
  const missing: string[] = [];

  if (!config.username) {
    missing.push("OPENF1_USERNAME");
  }

  if (!config.password) {
    missing.push("OPENF1_PASSWORD");
  }

  if (!config.tokenUrl) {
    missing.push("OPENF1_TOKEN_URL");
  }

  if (!config.mqttHost) {
    missing.push("OPENF1_MQTT_HOST");
  }

  if (!config.mqttWebSocketUrl) {
    missing.push("OPENF1_MQTT_WS_URL");
  }

  if (missing.length > 0) {
    throw new Error(`DATA_MODE=live requires backend-only OpenF1 configuration: ${missing.join(", ")}.`);
  }
}
