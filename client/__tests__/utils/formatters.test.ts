import { describe, expect, it } from 'vitest';
import {
  formatDuration,
  formatNumber,
  formatRelative,
  formatRequestsPerSecond
} from '../../src/utils/formatters';

describe('formatRelative', () => {
  it('shows seconds for recent timestamps', () => {
    expect(formatRelative(Date.now() - 30000)).toContain('s ago');
  });

  it('shows minutes for older timestamps', () => {
    expect(formatRelative(Date.now() - 120000)).toContain('m ago');
  });

  it('shows hours for very old timestamps', () => {
    expect(formatRelative(Date.now() - 7200000)).toContain('h ago');
  });
});

describe('formatNumber', () => {
  it('adds thousands separator', () => {
    expect(formatNumber(1234567)).toContain(',');
  });

  it('handles zero', () => {
    expect(formatNumber(0)).toBe('0');
  });
});

describe('formatDuration', () => {
  it('shows ms for sub-second', () => {
    expect(formatDuration(500)).toContain('ms');
  });

  it('shows s for over a second', () => {
    expect(formatDuration(2500)).toContain('s');
  });
});

describe('formatRequestsPerSecond', () => {
  it('shows 0 req/s for zero', () => {
    expect(formatRequestsPerSecond(0)).toBe('0 req/s');
  });

  it('includes req/s suffix', () => {
    expect(formatRequestsPerSecond(4.5)).toContain('req/s');
  });

  it('rounds to 1 decimal', () => {
    expect(formatRequestsPerSecond(4.56)).toBe('4.6 req/s');
  });
});
