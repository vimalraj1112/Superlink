import crypto from 'crypto';
import { env } from '@/config/env';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96-bit IV for GCM
const AUTH_TAG_LENGTH = 16; // 128-bit auth tag
const KEY_LENGTH = 32; // 256-bit key

let encryptionKey: Buffer;

function getEncryptionKey(): Buffer {
  if (!encryptionKey) {
    // Derive a proper 32-byte key from the environment variable
    const keyMaterial = env.ENCRYPTION_KEY;
    encryptionKey = crypto.scryptSync(keyMaterial, 'superlink-salt', KEY_LENGTH);
  }
  return encryptionKey;
}

/**
 * Encrypt a plaintext string using AES-256-GCM
 * Returns a base64-encoded string containing: IV + ciphertext + authTag
 */
export function encrypt(text: string): string {
  if (!text) return '';

  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  const ciphertext = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  // Combine: IV + ciphertext + authTag
  const combined = Buffer.concat([iv, ciphertext, authTag]);
  return combined.toString('base64');
}

/**
 * Decrypt a base64-encoded string encrypted with encrypt()
 * Returns the original plaintext string
 */
export function decrypt(encryptedText: string): string {
  if (!encryptedText) return '';

  try {
    const key = getEncryptionKey();
    const combined = Buffer.from(encryptedText, 'base64');

    // Extract IV, ciphertext, and authTag
    const iv = combined.subarray(0, IV_LENGTH);
    const authTag = combined.subarray(combined.length - AUTH_TAG_LENGTH);
    const ciphertext = combined.subarray(IV_LENGTH, combined.length - AUTH_TAG_LENGTH);

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    return plaintext.toString('utf8');
  } catch (error) {
    console.error('Decryption failed:', error);
    throw new Error('Failed to decrypt data. The data may be corrupted or the encryption key may have changed.');
  }
}

/**
 * Encrypt an object (serializes to JSON first)
 */
export function encryptObject<T>(obj: T): string {
  return encrypt(JSON.stringify(obj));
}

/**
 * Decrypt to an object
 */
export function decryptObject<T>(encryptedText: string): T {
  const decrypted = decrypt(encryptedText);
  return JSON.parse(decrypted) as T;
}

/**
 * Check if a string appears to be encrypted (base64 with proper length)
 */
export function isEncrypted(text: string): boolean {
  if (!text) return false;
  try {
    const decoded = Buffer.from(text, 'base64');
    // Minimum length: IV (12) + authTag (16) = 28 bytes, plus at least 1 byte ciphertext
    return decoded.length >= 29;
  } catch {
    return false;
  }
}