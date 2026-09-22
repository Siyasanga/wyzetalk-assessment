import type { TicketStatsDto } from '@wyzetalk/db/types';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Dashboard } from './Dashboard';

const stats: TicketStatsDto = {
  total: 10,
  byStatus: { open: 4, in_progress: 3, resolved: 2, closed: 1 },
  byPriority: { low: 1, medium: 4, high: 3, urgent: 2 },
  byCategory: { hardware: 5, software: 3, network: 2, access: 0, facilities: 0, other: 0 },
  overdue: 2,
  unassigned: 6,
};

describe('Dashboard', () => {
  it('shows the four figures the brief asks for', () => {
    render(<Dashboard stats={stats} onDrillDown={vi.fn()} />);

    expect(screen.getByRole('button', { name: /Open/ })).toHaveTextContent('4');
    expect(screen.getByRole('button', { name: /In progress/ })).toHaveTextContent('3');
    // High priority combines high and urgent: 3 + 2.
    expect(screen.getByRole('button', { name: /High priority/ })).toHaveTextContent('5');
    expect(screen.getByRole('button', { name: /Overdue/ })).toHaveTextContent('2');
  });

  it('breaks requests down by category, hiding the empty ones', () => {
    render(<Dashboard stats={stats} onDrillDown={vi.fn()} />);

    expect(screen.getByRole('button', { name: /Hardware/ })).toHaveTextContent('5');
    expect(screen.getByRole('button', { name: /Network/ })).toHaveTextContent('2');
    expect(screen.queryByRole('button', { name: /Facilities/ })).not.toBeInTheDocument();
  });

  it('drills down into the list when a tile is clicked', async () => {
    const onDrillDown = vi.fn();
    const user = userEvent.setup();
    render(<Dashboard stats={stats} onDrillDown={onDrillDown} />);

    await user.click(screen.getByRole('button', { name: /Overdue/ }));
    expect(onDrillDown).toHaveBeenCalledWith({ overdue: true });

    await user.click(screen.getByRole('button', { name: /Hardware/ }));
    expect(onDrillDown).toHaveBeenCalledWith({ category: 'hardware' });
  });

  it('says it is loading rather than rendering zeroes it does not know', () => {
    render(<Dashboard stats={null} onDrillDown={vi.fn()} />);

    expect(screen.getByText('Loading figures…')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
