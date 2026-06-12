import type { AppConfig } from "../config/env.js";
import { OPENF1_MVP_TOPICS, type OpenF1MvpTopic } from "./openf1-topics.js";

export type OpenF1Config = {
  readonly username: string;
  readonly password: string;
  readonly tokenUrl: string;
  readonly restBaseUrl: string;
  readonly mqtt: {
    readonly host: string;
    readonly port: number;
    readonly webSocketUrl: string;
    readonly clientUsername: string;
  };
  readonly topics: readonly OpenF1MvpTopic[];
};

export function createOpenF1Config(config: AppConfig["openF1"]): OpenF1Config {
  if (!config.username || !config.password) {
    throw new Error("OpenF1 username and password are required for live mode.");
  }

  return {
    username: config.username,
    password: config.password,
    tokenUrl: config.tokenUrl,
    restBaseUrl: config.restBaseUrl,
    mqtt: {
      host: config.mqttHost,
      port: config.mqttPort,
      webSocketUrl: config.mqttWebSocketUrl,
      clientUsername: config.mqttClientUsername ?? config.username
    },
    topics: OPENF1_MVP_TOPICS
  };
}
