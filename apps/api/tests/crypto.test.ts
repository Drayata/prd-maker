import { describe, expect, it } from 'vitest';
import { decryptSecret, encryptSecret, maskSecret } from '../src/lib/crypto.js';

describe('enkripsi secret', () => {
  it('round-trip AES-256-GCM dan memakai IV berbeda', () => {
    const first = encryptSecret('sk-rahasia-a3f9');
    const second = encryptSecret('sk-rahasia-a3f9');
    expect(first.ciphertext).not.toBe('sk-rahasia-a3f9');
    expect(first.iv).not.toBe(second.iv);
    expect(decryptSecret(first)).toBe('sk-rahasia-a3f9');
  });
  it('menolak ciphertext yang dimodifikasi', () => {
    const encrypted = encryptSecret('secret');
    expect(() =>
      decryptSecret({ ...encrypted, ciphertext: Buffer.from('rusak').toString('base64') }),
    ).toThrow('tidak dapat didekripsi');
  });
  it('menyamarkan key', () => expect(maskSecret('sk-rahasia-a3f9')).toBe('sk-••••••••a3f9'));
});
