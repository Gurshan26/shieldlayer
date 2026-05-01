import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import MetricCard from '../../src/components/MetricCard/MetricCard';

describe('MetricCard', () => {
  it('renders value and label', () => {
    render(<MetricCard value={1234} label="Total Requests" />);
    expect(screen.getByText('1,234')).toBeInTheDocument();
    expect(screen.getByText('Total Requests')).toBeInTheDocument();
  });

  it('renders dash for null', () => {
    render(<MetricCard value={null} label="Test" />);
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('renders trend indicator when provided', () => {
    render(<MetricCard value={50} label="Test" trend="up" trendValue="12%" />);
    expect(screen.getByText(/12%/)).toBeInTheDocument();
  });

  it('renders string values directly', () => {
    render(<MetricCard value="4.2 req/s" label="Rate" />);
    expect(screen.getByText('4.2 req/s')).toBeInTheDocument();
  });
});
