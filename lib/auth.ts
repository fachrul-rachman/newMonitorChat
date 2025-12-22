import crypto from "crypto";

export const SESSION_COOKIE_NAME = "monitorchat_session";

type SessionPayload = {
  username: string;
  issuedAt: number;
};

type AuthEnv = {
  username: string;
  password: string;
  secret: string;
};

function getEnvValue(name: string): string | undefined {
  const value = process.env[name];
  if (!value || value.trim().length === 0) {
    return undefined;
  }
  return value;
}

export function getAuthEnv(): AuthEnv | null {
  const username = getEnvValue("AUTH_USERNAME");
  const password = getEnvValue("AUTH_PASSWORD");
  const secret = getEnvValue("AUTH_SESSION_SECRET");

  if (!username || !password || !secret) {
    return null;
  }

  return {
    username,
    password,
    secret,
  };
}

export function isAuthConfigured(): boolean {
  return getAuthEnv() !== null;
}

function base64UrlEncode(buffer: Buffer): string {
  return buffer
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function base64UrlDecode(input: string): Buffer | null {
  try {
    const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
    const padLength = (4 - (normalized.length % 4)) % 4;
    const padded = normalized + "=".repeat(padLength);
    return Buffer.from(padded, "base64");
  } catch {
    return null;
  }
}

function signPayload(payload: SessionPayload, secret: string): string {
  const json = JSON.stringify(payload);
  const hmac = crypto.createHmac("sha256", secret);
  hmac.update(json);
  return base64UrlEncode(hmac.digest());
}

export function createSessionCookie(username: string, secret: string): string {
  const payload: SessionPayload = {
    username,
    issuedAt: Date.now(),
  };
  const payloadEncoded = base64UrlEncode(
    Buffer.from(JSON.stringify(payload), "utf8"),
  );
  const signature = signPayload(payload, secret);
  return `${payloadEncoded}.${signature}`;
}

export function verifySessionCookie(
  token: string,
  secret: string,
): SessionPayload | null {
  if (!token.includes(".")) {
    return null;
  }
  const [payloadEncoded, signature] = token.split(".", 2);
  const payloadBuffer = base64UrlDecode(payloadEncoded);
  if (!payloadBuffer) {
    return null;
  }

  let payload: SessionPayload;
  try {
    payload = JSON.parse(payloadBuffer.toString("utf8"));
  } catch {
    return null;
  }

  const expectedSignature = signPayload(payload, secret);

  if (!constantTimeCompare(signature, expectedSignature)) {
    return null;
  }

  return payload;
}

export function constantTimeCompare(a: string, b: string): boolean {
  const aBuffer = Buffer.from(a, "utf8");
  const bBuffer = Buffer.from(b, "utf8");
  if (aBuffer.length !== bBuffer.length) {
    return false;
  }
  return crypto.timingSafeEqual(aBuffer, bBuffer);
}
