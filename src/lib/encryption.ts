import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // GCM recommended IV size
const AUTH_TAG_LENGTH = 16; // GCM auth tag size

export function encrypt(text: string, hexKey: string): string {
  if (!text) return text;
  if (!hexKey) throw new Error("Encryption key is required");

  const key = Buffer.from(hexKey, 'hex');
  if (key.length !== 32) throw new Error("Invalid key length for aes-256-gcm");

  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  // Return format: iv:authTag:encryptedData
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

export function decrypt(encryptedData: string, hexKey: string): string {
  if (!encryptedData) return encryptedData;
  if (!encryptedData.includes(':')) return encryptedData; // Assume it's unencrypted
  if (!hexKey) throw new Error("Encryption key is required");

  const key = Buffer.from(hexKey, 'hex');
  if (key.length !== 32) throw new Error("Invalid key length for aes-256-gcm");

  const parts = encryptedData.split(':');
  if (parts.length !== 3) return encryptedData; // Malformed, return as is (might be old data or different format)

  try {
    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const textToDecrypt = parts[2];
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(textToDecrypt, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    console.error("Decryption failed:", error instanceof Error ? error.message : "Unknown error");
    return encryptedData; // fallback
  }
}
