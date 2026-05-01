import { describe, expect, it } from 'vitest';
import { httpCodeToColour, statusToBg, statusToColour } from '../../src/utils/statusColour';

describe('statusToColour', () => {
  it('allowed → green', () => {
    expect(statusToColour('allowed')).toContain('allowed');
  });

  it('throttled → amber', () => {
    expect(statusToColour('throttled')).toContain('throttled');
  });

  it('blocked → red', () => {
    expect(statusToColour('blocked')).toContain('blocked');
  });

  it('flagged → violet', () => {
    expect(statusToColour('flagged')).toContain('flagged');
  });
});

describe('statusToBg', () => {
  it('maps to bg tokens', () => {
    expect(statusToBg('allowed')).toContain('allowed-bg');
  });
});

describe('httpCodeToColour', () => {
  it('2xx → allowed green', () => {
    expect(httpCodeToColour(200)).toContain('allowed');
  });

  it('429 → throttled amber', () => {
    expect(httpCodeToColour(429)).toContain('throttled');
  });

  it('403 → flagged violet', () => {
    expect(httpCodeToColour(403)).toContain('flagged');
  });

  it('500 → blocked red', () => {
    expect(httpCodeToColour(500)).toContain('blocked');
  });

  it('301 → accent blue', () => {
    expect(httpCodeToColour(301)).toContain('accent');
  });
});
