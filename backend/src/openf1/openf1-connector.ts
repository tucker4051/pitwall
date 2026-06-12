import mqtt, { type MqttClient } from "mqtt";

import type { SourceMessage } from "../messages/source-message-types.js";
import type { OpenF1Config } from "./openf1-config.js";
import { mapOpenF1Message } from "./openf1-message-mapper.js";
import { createOpenF1MessageOrderTracker } from "./openf1-message-order.js";
import type { OpenF1TokenManager } from "./openf1-token-manager.js";

export type OpenF1Connector = {
  readonly connect: () => Promise<void>;
  readonly disconnect: () => Promise<void>;
};

export type OpenF1ConnectorOptions = {
  readonly onSourceMessage?: (message: SourceMessage) => void;
};

export function createOpenF1Connector(
  config: OpenF1Config,
  tokenManager: OpenF1TokenManager,
  options: OpenF1ConnectorOptions = {}
): OpenF1Connector {
  let client: MqttClient | null = null;
  const messageOrderTracker = createOpenF1MessageOrderTracker();

  return {
    async connect(): Promise<void> {
      if (client) {
        return;
      }

      console.log("OpenF1 MQTT connecting.", {
        host: config.mqtt.host,
        port: config.mqtt.port,
        topicCount: config.topics.length
      });

      const accessToken = await tokenManager.getValidAccessToken();

      client = mqtt.connect({
        protocol: "mqtts",
        host: config.mqtt.host,
        port: config.mqtt.port,
        username: config.mqtt.clientUsername,
        password: accessToken
      });

      client.on("connect", () => {
        console.log("OpenF1 MQTT connected.");
        client?.subscribe([...config.topics], (error) => {
          if (error) {
            console.error("OpenF1 MQTT topic subscription failed.", {
              message: error.message
            });
            return;
          }

          console.log("OpenF1 MQTT subscribed to MVP topics.", {
            topicCount: config.topics.length
          });
        });
      });

      client.on("message", (topic, payload) => {
        const metadata = parseMessageMetadata(payload);

        console.log("OpenF1 MQTT message received.", {
          topic,
          payloadBytes: payload.length,
          jsonParseSucceeded: metadata.jsonParseSucceeded,
          hasId: metadata.hasId,
          hasKey: metadata.hasKey
        });

        if (!metadata.jsonParseSucceeded) {
          return;
        }

        const orderResult = messageOrderTracker.shouldProcess(topic, metadata.parsedPayload);

        if (!orderResult.accepted) {
          console.log("OpenF1 MQTT message dropped due to older _id.", {
            topic,
            id: orderResult.id,
            lastProcessedId: orderResult.lastProcessedId
          });
          return;
        }

        const mappedMessage = mapOpenF1Message(topic, metadata.parsedPayload, new Date());

        if (!mappedMessage.mapped) {
          console.log("OpenF1 MQTT message not mapped.", {
            topic,
            reason: mappedMessage.reason
          });
          return;
        }

        console.log("OpenF1 MQTT message mapped to internal source message.", {
          topic,
          sourceType: mappedMessage.message.type
        });

        options.onSourceMessage?.(mappedMessage.message);
        console.log("OpenF1 source message handed to dashboard pipeline.", {
          topic,
          sourceType: mappedMessage.message.type
        });
      });

      client.on("reconnect", () => {
        console.log("OpenF1 MQTT reconnecting.");
        refreshCredentialsForReconnect(client, tokenManager).catch((error: unknown) => {
          console.error("OpenF1 MQTT token refresh before reconnect failed.", {
            message: getSafeErrorMessage(error)
          });
        });
      });

      client.on("offline", () => {
        console.log("OpenF1 MQTT offline.");
      });

      client.on("close", () => {
        console.log("OpenF1 MQTT closed.");
      });

      client.on("error", (error) => {
        console.error("OpenF1 MQTT error.", {
          message: getSafeErrorMessage(error)
        });
      });
    },

    async disconnect(): Promise<void> {
      if (!client) {
        return;
      }

      const activeClient = client;
      client = null;

      await new Promise<void>((resolve) => {
        activeClient.end(false, {}, () => {
          resolve();
        });
      });
    }
  };
}

type MessageMetadata = {
  readonly jsonParseSucceeded: boolean;
  readonly hasId: boolean;
  readonly hasKey: boolean;
  readonly parsedPayload: unknown;
};

function parseMessageMetadata(payload: Buffer): MessageMetadata {
  try {
    const value = JSON.parse(payload.toString("utf8")) as unknown;

    if (!isRecord(value)) {
      return {
        jsonParseSucceeded: true,
        hasId: false,
        hasKey: false,
        parsedPayload: value
      };
    }

    return {
      jsonParseSucceeded: true,
      hasId: "_id" in value,
      hasKey: "_key" in value,
      parsedPayload: value
    };
  } catch {
    return {
      jsonParseSucceeded: false,
      hasId: false,
      hasKey: false,
      parsedPayload: null
    };
  }
}

async function refreshCredentialsForReconnect(
  client: MqttClient | null,
  tokenManager: OpenF1TokenManager
): Promise<void> {
  if (!client) {
    return;
  }

  client.options.password = await tokenManager.getValidAccessToken();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getSafeErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}
