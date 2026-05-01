import { describe, expect, it } from 'vitest';
import { formatIP, isPrivateIP, isValidIPv4, maskApiKey } from '../../src/utils/ipUtils';

describe('isValidIPv4', () => {
  it('validates correct IPv4', () => {
    expect(isValidIPv4('192.168.1.1')).toBe(true);
    expect(isValidIPv4('0.0.0.0')).toBe(true);
    expect(isValidIPv4('255.255.255.255')).toBe(true);
    expect(isValidIPv4('203.0.113.1')).toBe(true);
  });

  it('rejects invalid formats', () => {
    expect(isValidIPv4('256.0.0.1')).toBe(false);
    expect(isValidIPv4('192.168.1')).toBe(false);
    expect(isValidIPv4('not-an-ip')).toBe(false);
    expect(isValidIPv4('')).toBe(false);
    expect(isValidIPv4('192.168.1.1.1')).toBe(false);
  });

  it('rejects leading zeros in octets', () => {
    expect(isValidIPv4('01.168.1.1')).toBe(false);
  });
});

describe('maskApiKey', () => {
  it('shows first 10 + last 4 chars', () => {
    const key = 'sl_fre_abcdefghijklmnopqrstuvwxyz';
    const masked = maskApiKey(key);
    expect(masked).toContain('sl_fre_abc');
    expect(masked).toContain('wxyz');
  });

  it('handles short key', () => {
    expect(maskApiKey('abc')).toBe('***');
  });
});

describe('formatIP', () => {
  it('pads octets', () => {
    expect(formatIP('1.2.3.4')).toBe('  1.  2.  3.  4');
  });
});

describe('isPrivateIP', () => {
  it('identifies private ranges', () => {
    expect(isPrivateIP('10.0.0.1')).toBe(true);
    expect(isPrivateIP('192.168.1.100')).toBe(true);
    expect(isPrivateIP('172.16.0.1')).toBe(true);
    expect(isPrivateIP('127.0.0.1')).toBe(true);
  });

  it('does not flag public IPs', () => {
    expect(isPrivateIP('8.8.8.8')).toBe(false);
    expect(isPrivateIP('203.0.113.1')).toBe(false);
  });
});
