import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import { env } from '../config/env.js';
import { AppError } from './errors.js';

const ipv4Ranges: Array<[number, number]> = [
  [0x0a000000, 0xff000000],
  [0x7f000000, 0xff000000],
  [0xa9fe0000, 0xffff0000],
  [0xac100000, 0xfff00000],
  [0xc0a80000, 0xffff0000],
  [0x00000000, 0xff000000],
];

function ipv4Number(address: string): number {
  return address.split('.').reduce((value, part) => ((value << 8) | Number(part)) >>> 0, 0);
}

export function isPrivateIp(address: string): boolean {
  if (isIP(address) === 4) {
    const value = ipv4Number(address);
    return ipv4Ranges.some(([network, mask]) => (value & mask) >>> 0 === network >>> 0);
  }
  if (isIP(address) === 6) {
    const normalized = address.toLowerCase();
    if (normalized === '::1' || normalized === '::') return true;
    if (normalized.startsWith('fc') || normalized.startsWith('fd')) return true;
    if (/^fe[89ab]/.test(normalized)) return true;
    const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(normalized)?.[1];
    return mapped ? isPrivateIp(mapped) : false;
  }
  return true;
}

export type ResolveHostname = (
  hostname: string,
  options: { all: true; verbatim: true },
) => Promise<Array<{ address: string; family: number }>>;

export async function validateProviderUrl(
  rawUrl: string,
  resolve: ResolveHostname = lookup,
): Promise<URL> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new AppError(400, 'PROVIDER_URL_INVALID', 'Base URL provider tidak valid.');
  }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
    throw new AppError(
      400,
      'PROVIDER_URL_INVALID',
      'Base URL harus memakai HTTP atau HTTPS tanpa kredensial pada URL.',
    );
  }
  if (url.hostname.toLowerCase() === 'localhost' && !env.ALLOW_PRIVATE_PROVIDER_URLS) {
    throw new AppError(
      400,
      'PROVIDER_URL_PRIVATE',
      'Alamat jaringan lokal diblokir. Aktifkan ALLOW_PRIVATE_PROVIDER_URLS hanya pada instalasi tepercaya.',
    );
  }
  if (!env.ALLOW_PRIVATE_PROVIDER_URLS) {
    let addresses: Array<{ address: string; family: number }>;
    try {
      addresses = await resolve(url.hostname, { all: true, verbatim: true });
    } catch {
      throw new AppError(400, 'PROVIDER_DNS_FAILED', 'Hostname provider tidak dapat ditemukan.');
    }
    if (
      !Array.isArray(addresses) ||
      addresses.length === 0 ||
      addresses.some(({ address }) => isPrivateIp(address))
    ) {
      throw new AppError(
        400,
        'PROVIDER_URL_PRIVATE',
        'Alamat provider mengarah ke jaringan internal yang diblokir.',
      );
    }
  }
  url.pathname = url.pathname.replace(/\/+$/, '');
  return url;
}

export async function resolveSafeUrl(url: URL, resolve: ResolveHostname = lookup): Promise<URL> {
  return validateProviderUrl(url.toString(), resolve);
}
