import mqtt, { type MqttClient } from "mqtt";

import type { OpenF1Config } from "./openf1-config.js";
import type { OpenF1TokenManager } from "./openf1-token-manager.js";

export type OpenF1Connector = {
  readonly connect: () => Promise<void>;
  readonly disconnect: () => Promise<void>;
};

export function createOpenF1Connector(config: OpenF1Config, tokenManager: OpenF1TokenManager): OpenF1Connector {
  let client: MqttClient | null = null;

  return {
    async connect(): Promise<void> {
      if (client) {
        return;
      }

      console.log("OpenF1 MQTT connecting.", {
        host: config.mqtt.host,
        port: config.mqtt.port,
        topics: config.topics
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
        console.log("OpenF1 MQTT message received.", {
          topic,
          messageLength: payload.length
        });
      });

      client.on("reconnect", () => {
        console.log("OpenF1 MQTT reconnecting.");
      });

      client.on("offline", () => {
        console.log("OpenF1 MQTT offline.");
      });

      client.on("close", () => {
        console.log("OpenF1 MQTT closed.");
      });

      client.on("error", (error) => {
        console.error("OpenF1 MQTT error.", {
          message: error.message
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
