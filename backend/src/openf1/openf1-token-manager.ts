import type { OpenF1Config } from "./openf1-config.js";

type OpenF1TokenResponse = {
  readonly access_token: string;
  readonly expires_in: number;
  readonly token_type: string;
};

type CachedToken = {
  readonly accessToken: string;
  readonly expiresAtMs: number;
  readonly tokenType: string;
};

const TOKEN_EXPIRY_BUFFER_MS = 60_000;

export type OpenF1TokenManager = {
  readonly getValidAccessToken: () => Promise<string>;
};

export function createOpenF1TokenManager(config: OpenF1Config): OpenF1TokenManager {
  let cachedToken: CachedToken | null = null;

  return {
    async getValidAccessToken(): Promise<string> {
      if (cachedToken && !isTokenExpiring(cachedToken)) {
        return cachedToken.accessToken;
      }

      cachedToken = await requestOpenF1Token(config);
      return cachedToken.accessToken;
    }
  };
}

async function requestOpenF1Token(config: OpenF1Config): Promise<CachedToken> {
  const body = new URLSearchParams({
    username: config.username,
    password: config.password
  });

  const response = await fetch(config.tokenUrl, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded"
    },
    body
  });

  if (!response.ok) {
    throw new Error(`OpenF1 token request failed with status ${response.status}.`);
  }

  const tokenResponse = parseTokenResponse(await response.json());

  return {
    accessToken: tokenResponse.access_token,
    expiresAtMs: Date.now() + tokenResponse.expires_in * 1_000,
    tokenType: tokenResponse.token_type
  };
}

function parseTokenResponse(value: unknown): OpenF1TokenResponse {
  if (!isRecord(value)) {
    throw new Error("OpenF1 token response must be an object.");
  }

  if (!isString(value.access_token) || !isNumber(value.expires_in) || !isString(value.token_type)) {
    throw new Error("OpenF1 token response is missing required fields.");
  }

  return {
    access_token: value.access_token,
    expires_in: value.expires_in,
    token_type: value.token_type
  };
}

function isTokenExpiring(token: CachedToken): boolean {
  return Date.now() >= token.expiresAtMs - TOKEN_EXPIRY_BUFFER_MS;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function isNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}
