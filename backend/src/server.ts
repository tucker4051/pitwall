import { createServer, type IncomingMessage, type ServerResponse } from "node:http";

import type { AppConfig } from "./config/env.js";

export function createAppServer(config: AppConfig) {
  return createServer((request, response) => {
    if (request.method === "GET" && request.url === "/health") {
      console.log("GET /health");

      sendJson(response, 200, {
        status: "ok",
        app: config.appName,
        dataMode: config.dataMode
      });
      return;
    }

    sendJson(response, 404, {
      error: "not_found"
    });
  });
}

function sendJson(response: ServerResponse<IncomingMessage>, statusCode: number, body: unknown): void {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  });
  response.end(JSON.stringify(body));
}
