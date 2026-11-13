import "server-only";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

function keyBytes() {
  const encoded = process.env.PORTAL_CREDENTIAL_ENCRYPTION_KEY;
  if (!encoded) throw new Error("PORTAL_CREDENTIAL_ENCRYPTION_KEY is not configured.");
  const key = Buffer.from(encoded, "base64");
  if (key.length !== 32) throw new Error("PORTAL_CREDENTIAL_ENCRYPTION_KEY must be a base64 encoded 32-byte key.");
  return key;
}

export function sealSecret(value: string) {
  const nonce = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", keyBytes(), nonce);
  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return { ciphertext: ciphertext.toString("base64url"), nonce: nonce.toString("base64url"), tag: cipher.getAuthTag().toString("base64url") };
}

export function openSecret(value: { ciphertext: string; nonce: string; tag: string }) {
  const decipher = createDecipheriv("aes-256-gcm", keyBytes(), Buffer.from(value.nonce, "base64url"));
  decipher.setAuthTag(Buffer.from(value.tag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(value.ciphertext, "base64url")), decipher.final()]).toString("utf8");
}
