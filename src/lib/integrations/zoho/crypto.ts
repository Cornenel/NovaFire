import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";

const VERSION = "v1";

export function encryptSecret(plaintext: string, key: Buffer): string {
  if (key.length !== 32) throw new Error("Zoho token encryption key must be 32 bytes.");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return [
    VERSION,
    iv.toString("base64url"),
    tag.toString("base64url"),
    ciphertext.toString("base64url"),
  ].join(".");
}

export function decryptSecret(payload: string, key: Buffer): string {
  if (key.length !== 32) throw new Error("Zoho token encryption key must be 32 bytes.");
  const [version, ivPart, tagPart, dataPart] = payload.split(".");
  if (version !== VERSION || !ivPart || !tagPart || !dataPart) {
    throw new Error("Zoho token payload could not be read.");
  }
  const iv = Buffer.from(ivPart, "base64url");
  const tag = Buffer.from(tagPart, "base64url");
  const data = Buffer.from(dataPart, "base64url");
  if (iv.length !== 12 || tag.length !== 16) {
    throw new Error("Zoho token payload could not be read.");
  }
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  const plaintext = Buffer.concat([decipher.update(data), decipher.final()]);
  return plaintext.toString("utf8");
}

export function hashOAuthState(state: string): string {
  return createHash("sha256").update(state).digest("hex");
}

export function createOAuthState(): string {
  return randomBytes(32).toString("base64url");
}

export function safeEqual(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function mergeRefreshToken(
  stored: string | null,
  incoming: string | null | undefined
): string | null {
  const next = incoming?.trim();
  if (next) return next;
  return stored?.trim() || null;
}

export function sanitizeExternalError(status: number, code?: string | number | null): string {
  const numeric = typeof code === "number" || (typeof code === "string" && /^\d+$/.test(code));
  if (numeric) return `Zoho Books request failed (${status}, code ${code}).`;
  if (code === "invalid_code" || code === "invalid_client" || code === "access_denied") {
    return `Zoho authorisation failed (${code}).`;
  }
  return `Zoho Books request failed (${status}).`;
}
