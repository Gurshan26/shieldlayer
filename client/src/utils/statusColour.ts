import { RequestStatus } from '../../../../server/src/types';

export function statusToColour(status: RequestStatus): string {
  const map: Record<RequestStatus, string> = {
    allowed: 'var(--allowed)',
    throttled: 'var(--throttled)',
    blocked: 'var(--blocked)',
    flagged: 'var(--flagged)'
  };
  return map[status] || 'var(--ink-4)';
}

export function statusToBg(status: RequestStatus): string {
  const map: Record<RequestStatus, string> = {
    allowed: 'var(--allowed-bg)',
    throttled: 'var(--throttled-bg)',
    blocked: 'var(--blocked-bg)',
    flagged: 'var(--flagged-bg)'
  };
  return map[status] || 'var(--surface-2)';
}

export function httpCodeToColour(code: number): string {
  if (code < 300) return 'var(--allowed)';
  if (code < 400) return 'var(--accent)';
  if (code === 429) return 'var(--throttled)';
  if (code >= 400 && code < 500) return 'var(--flagged)';
  return 'var(--blocked)';
}
