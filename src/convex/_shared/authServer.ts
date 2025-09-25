"use node";

import { scrypt as scryptCb, randomBytes, createHash, timingSafeEqual } from "crypto";
import { promisify } from "util";

const scrypt = promisify(scryptCb);

const SALT_BYTES = 16;
const KEYLEN = 64;
const SCRYPT_OPTS = {
  N: 16384,
  r: 8,
  p: 1,
  maxmem: 32 * 1024 * 1024,
} as const;

export async function hashPassword(password: string): Promise<{ hash: string }> {
  const salt = randomBytes(SALT_BYTES);
  // Use 3-arg scrypt to satisfy the current TS/node types
  const derived = await scrypt(password, salt, KEYLEN);
  const hash = `scrypt:${salt.toString("hex")}:${(derived as any).toString("hex")}`;
  return { hash };
}

export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  try {
    if (!storedHash || !storedHash.startsWith("scrypt:")) return false;
    const [, saltHex, keyHex] = storedHash.split(":");
    if (!saltHex || !keyHex) return false;

    const salt = Buffer.from(saltHex, "hex");
    const expected = Buffer.from(keyHex, "hex");
    // Use 3-arg scrypt (no options)
    const derived = await scrypt(password, salt, expected.length);

    if ((derived as any).length !== expected.length) return false;
    return timingSafeEqual(derived as any, expected);
  } catch {
    return false;
  }
}

export function randomToken(bytes: number = 32): string {
  // Hex to avoid env-specific base64url differences
  return randomBytes(bytes).toString("hex");
}

export function sha256Hex(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

export function parseIP(req: Request): string | undefined {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  const real = req.headers.get("x-real-ip");
  if (real) return real;
  return undefined;
}

type SameSite = "Lax" | "Strict" | "None";

export type CookieOptions = {
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: SameSite;
  path?: string;
  maxAge?: number;
  expires?: Date;
  domain?: string;
};

export function serializeCookie(name: string, value: string, options: CookieOptions = {}): string {
  const parts: string[] = [];
  parts.push(`${encodeURIComponent(name)}=${encodeURIComponent(value)}`);

  const path = options.path ?? "/";
  parts.push(`Path=${path}`);

  const httpOnly = options.httpOnly ?? true;
  if (httpOnly) parts.push("HttpOnly");

  const secure = options.secure ?? true;
  if (secure) parts.push("Secure");

  const sameSite = options.sameSite ?? "Lax";
  parts.push(`SameSite=${sameSite}`);

  if (typeof options.maxAge === "number") {
    parts.push(`Max-Age=${Math.floor(options.maxAge)}`);
  }
  if (options.expires) {
    parts.push(`Expires=${options.expires.toUTCString()}`);
  }
  if (options.domain) {
    parts.push(`Domain=${options.domain}`);
  }

  return parts.join("; ");
}