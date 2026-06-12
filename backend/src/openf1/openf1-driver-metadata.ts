import type { OpenF1InternalDriver, OpenF1SourceMessage } from "../messages/source-message-types.js";
import type { OpenF1Config } from "./openf1-config.js";
import { createOpenF1RestClient, parseOpenF1Drivers } from "./openf1-rest-client.js";
import type { OpenF1TokenManager } from "./openf1-token-manager.js";

export type OpenF1DriverMetadataFetcher = {
  readonly fetchDriversForSession: (sessionKey: string | number) => Promise<OpenF1SourceMessage & { readonly type: "openf1:drivers" }>;
};

export function createOpenF1DriverMetadataFetcher(
  config: OpenF1Config,
  tokenManager: OpenF1TokenManager
): OpenF1DriverMetadataFetcher {
  const restClient = createOpenF1RestClient(config, tokenManager);

  return {
    async fetchDriversForSession(sessionKey: string | number): Promise<OpenF1SourceMessage & { readonly type: "openf1:drivers" }> {
      const recordedAt = new Date().toISOString();
      const drivers = await restClient.fetchDriversForSession(sessionKey);

      return createOpenF1DriverMetadataSourceMessage(sessionKey, drivers, recordedAt);
    }
  };
}

export function createOpenF1DriverMetadataSourceMessage(
  sessionKey: string | number,
  drivers: readonly OpenF1InternalDriver[],
  recordedAt: string
): OpenF1SourceMessage & { readonly type: "openf1:drivers" } {
  return {
    type: "openf1:drivers",
    recordedAt,
    metadata: {
      source: "openf1",
      topic: "v1/drivers",
      sessionKey,
      receivedAt: recordedAt
    },
    payload: {
      drivers
    }
  };
}

export function parseOpenF1DriverMetadataResponse(value: unknown): readonly OpenF1InternalDriver[] {
  return parseOpenF1Drivers(value);
}
