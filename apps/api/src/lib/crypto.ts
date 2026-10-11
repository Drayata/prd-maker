import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { env } from '../config/env.js';

export interface EncryptedSecret {
  ciphertext: string;
  iv: string;
  authTag: string;
  keyVersion: number;
}

function key() {
  const value = Buffer.from(env.ENCRYPTION_KEY, 'base64');
  if (value.length !== 32) throw new Error('ENCRYPTION_KEY harus tepat 32 byte.');
  return value;
}

export function encryptSecret(plaintext: string): EncryptedSecret {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  return {
    ciphertext: ciphertext.toString('base64'),
    iv: iv.toString('base64'),
    authTag: cipher.getAuthTag().toString('base64'),
    keyVersion: env.ENCRYPTION_KEY_VERSION,
  };
}

export function decryptSecret(value: Omit<EncryptedSecret, 'keyVersion'>): string {
  try {
    const decipher = createDecipheriv('aes-256-gcm', key(), Buffer.from(value.iv, 'base64'));
    decipher.setAuthTag(Buffer.from(value.authTag, 'base64'));
    return Buffer.concat([
      decipher.update(Buffer.from(value.ciphertext, 'base64')),
      decipher.final(),
    ]).toString('utf8');
  } catch {
    throw new Error('API key tidak dapat didekripsi. Periksa versi kunci enkripsi.');
  }
}

export function maskSecret(secret: string): string {
  if (!secret) return '';
  const prefix =
    secret.length > 8 ? secret.slice(0, Math.min(3, secret.indexOf('-') + 1 || 3)) : '';
  return `${prefix}••••••••${secret.slice(-4)}`;
}
