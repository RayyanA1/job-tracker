import { describe, expect, it } from 'vitest';
import { publicAddress } from './job-posting.client.ts';

describe('job posting client', () => {
  it.each([
    '127.0.0.1',
    '169.254.1.2',
    '192.168.10.10',
    '::1',
    '::ffff:10.12.13.14',
    'fe80::1',
    '64:ff9b::1',
  ])('blocks non-public network address %s', (address) => {
    expect(publicAddress(address)).toBe(false);
  });
});
