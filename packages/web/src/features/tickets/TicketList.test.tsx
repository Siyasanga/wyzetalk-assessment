import type { TicketDto } from '@wyzetalk/db/types';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { createApiError } from '../../lib/api-error';
import { TicketList } from './TicketList';

function ticket(overrides: Partial<TicketDto> = {}): TicketDto {
  return {
    id: '6650f1a2b3c4d5e6f7a8b9c0',
    title: 'Laptop will not connect to WiFi',
    description: 'Drops the office network every few minutes since this morning.',
    status: 'open',
    priority: 'high',
    category: 'network',
    requester: {
      id: '6650f1a2b3c4d5e6f7a8b9c1',
      name: 'Sam',
      email: 'sam@wyzetalk.test',
      role: 'requester',
    },
    assignee: null,
    dueAt: '2026-09-23T09:00:00.000Z',
    isOverdue: false,
    resolvedAt: null,
    closedAt: null,
    createdAt: '2026-09-22T09:00:00.000Z',
    updatedAt: '2026-09-22T09:00:00.000Z',
    ...overrides,
  };
}

describe('TicketList', () => {
  it('offers only the moves the API would accept from the current status', () => {
    render(
      <TicketList
        tickets={[ticket({ status: 'resolved' })]}
        total={1}
        isLoading={false}
        api={{ changeStatus: vi.fn() }}
        onChanged={vi.fn()}
        onSelect={vi.fn()}
      />,
    );

    // resolved -> in_progress | closed. Never straight back to open.
    expect(screen.getByRole('button', { name: 'Mark in progress' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mark closed' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Mark open' })).not.toBeInTheDocument();
  });

  it('changes status and tells the parent to refresh', async () => {
    const changeStatus = vi.fn().mockResolvedValue(ticket({ status: 'in_progress' }));
    const onChanged = vi.fn();
    const user = userEvent.setup();

    render(
      <TicketList
        tickets={[ticket()]}
        total={1}
        isLoading={false}
        api={{ changeStatus }}
        onChanged={onChanged}
        onSelect={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Mark in progress' }));

    await waitFor(() => expect(changeStatus).toHaveBeenCalledWith(ticket().id, 'in_progress'));
    expect(onChanged).toHaveBeenCalled();
  });

  it('surfaces a rejected transition instead of failing silently', async () => {
    const changeStatus = vi.fn().mockRejectedValue(
      createApiError({
        status: 409,
        code: 'INVALID_STATUS_TRANSITION',
        message: 'A ticket cannot move from "resolved" to "open".',
      }),
    );
    const user = userEvent.setup();

    render(
      <TicketList
        tickets={[ticket()]}
        total={1}
        isLoading={false}
        api={{ changeStatus }}
        onChanged={vi.fn()}
        onSelect={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Mark in progress' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('cannot move from');
  });

  it('flags an overdue request and opens the detail screen when the title is clicked', async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();
    const overdue = ticket({ isOverdue: true });

    render(
      <TicketList
        tickets={[overdue]}
        total={1}
        isLoading={false}
        api={{ changeStatus: vi.fn() }}
        onChanged={vi.fn()}
        onSelect={onSelect}
      />,
    );

    expect(screen.getByText('Overdue')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: overdue.title }));
    expect(onSelect).toHaveBeenCalledWith(overdue);
  });

  it('says so when nothing matches the filters', () => {
    render(
      <TicketList
        tickets={[]}
        total={0}
        isLoading={false}
        api={{ changeStatus: vi.fn() }}
        onChanged={vi.fn()}
        onSelect={vi.fn()}
      />,
    );

    expect(screen.getByText('No requests match these filters.')).toBeInTheDocument();
  });
});
