import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import RequestTable from '../../src/components/RequestTable/RequestTable';

describe('RequestTable', () => {
  it('renders empty state', () => {
    render(<RequestTable rows={[]} />);
    expect(screen.getByText(/No request logs yet/i)).toBeInTheDocument();
  });

  it('renders rows', () => {
    render(
      <RequestTable
        rows={[
          {
            id: '1',
            timestamp: Date.now(),
            ip: '203.0.113.1',
            method: 'GET',
            endpoint: '/api/demo/users',
            statusCode: 200,
            requestStatus: 'allowed',
            responseTimeMs: 12
          }
        ]}
      />
    );

    expect(screen.getByText('203.0.113.1')).toBeInTheDocument();
  });
});
