import crypto from "crypto";

/**
 * Generates a cryptographically secure 64-character hex string.
 */
export function generateAcknowledgementToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Computes the SHA-256 hash of a raw token.
 */
export function hashAcknowledgementToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}
