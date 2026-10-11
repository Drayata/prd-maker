import { describe, expect, it } from 'vitest';
import { isPrivateIp, validateProviderUrl } from '../src/lib/ssrf.js';

const publicResolver = async () => [{ address: '93.184.216.34', family: 4 as const }];

describe('SSRF guard', () => {
  it.each([
    '127.0.0.1',
    '10.1.2.3',
    '172.16.1.1',
    '192.168.1.1',
    '169.254.1.1',
    '::1',
    'fd00::1',
    'fe80::1',
  ])('memblokir IP private %s', (ip) => expect(isPrivateIp(ip)).toBe(true));
  it('menerima IP publik', () => expect(isPrivateIp('93.184.216.34')).toBe(false));
  it('memblokir localhost', async () =>
    await expect(
      validateProviderUrl('http://localhost:11434', publicResolver),
    ).rejects.toMatchObject({ code: 'PROVIDER_URL_PRIVATE' }));
  it('memblokir hostname yang resolve ke private IP', async () =>
    await expect(
      validateProviderUrl('https://evil.example', async () => [
        { address: '127.0.0.1', family: 4 },
      ]),
    ).rejects.toMatchObject({ code: 'PROVIDER_URL_PRIVATE' }));
  it('menormalisasi trailing slash URL publik', async () =>
    expect(
      (await validateProviderUrl('https://api.example.com/v1///', publicResolver)).toString(),
    ).toBe('https://api.example.com/v1'));
});
