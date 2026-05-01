import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import StatusBadge from '../../src/components/StatusBadge/StatusBadge';

describe('StatusBadge', () => {
  it('renders ALLOWED for allowed status', () => {
    render(<StatusBadge status="allowed" />);
    expect(screen.getByText('ALLOWED')).toBeInTheDocument();
  });

  it('renders THROTTLED for throttled', () => {
    render(<StatusBadge status="throttled" />);
    expect(screen.getByText('THROTTLED')).toBeInTheDocument();
  });

  it('renders BLOCKED for blocked', () => {
    render(<StatusBadge status="blocked" />);
    expect(screen.getByText('BLOCKED')).toBeInTheDocument();
  });

  it('renders FLAGGED for flagged', () => {
    render(<StatusBadge status="flagged" />);
    expect(screen.getByText('FLAGGED')).toBeInTheDocument();
  });

  it('has accessible aria-label', () => {
    render(<StatusBadge status="blocked" />);
    expect(screen.getByLabelText(/Status: BLOCKED/)).toBeInTheDocument();
  });
});
