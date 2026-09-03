import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";
const PREFIX = "enc:v1:";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

function getKey(): Buffer | null {
  const raw = process.env.ACCOUNT_ENCRYPTION_KEY;
  if (!raw) return null;

  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) {
    throw new Error("ACCOUNT_ENCRYPTION_KEY must decode to exactly 32 bytes (base64-encoded).");
  }
  return key;
}

/**
 * No-op (returns the value unchanged) until ACCOUNT_ENCRYPTION_KEY is set —
 * same "ready to activate" shape as the Sentry wiring. The key never touches
 * the database; it only ever lives in server-side env vars, so encrypted
 * fields stay unreadable even from a full database dump.
 */
export function encryptField(value: string): string {
  const key = getKey();
  if (!key) return value;

  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return PREFIX + Buffer.concat([iv, authTag, ciphertext]).toString("base64");
}

export function encryptOptionalField(value: string | undefined | null): string | undefined | null {
  if (!value) return value;
  return encryptField(value);
}

/**
 * A value without the enc:v1: prefix is legacy plaintext — written before
 * this key existed, or while it was unset — and is returned unchanged. That,
 * plus encryptField always encrypting going forward, is what lets existing
 * accounts keep working and get encrypted gradually (the next time each one
 * is saved) instead of needing an explicit migration script.
 */
export function decryptField(value: string | null): string | null {
  if (!value || !value.startsWith(PREFIX)) return value;

  const key = getKey();
  if (!key) {
    throw new Error("A stored value is encrypted but ACCOUNT_ENCRYPTION_KEY is not set — cannot decrypt it.");
  }

  const raw = Buffer.from(value.slice(PREFIX.length), "base64");
  const iv = raw.subarray(0, IV_LENGTH);
  const authTag = raw.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const ciphertext = raw.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);

  return plaintext.toString("utf8");
}
