import { describe, expect, it } from 'vitest';
import { isInvalidStatusTransitionError } from './errors.js';
import {
  TICKET_STATUSES,
  type Ticket,
  applyStatusChange,
  canTransition,
  isActiveStatus,
} from './ticket.js';
import { toTicketId } from './ticket.js';
import { toUserId } from './user.js';

const now = new Date('2026-01-01T09:00:00.000Z');

function ticket(overrides: Partial<Ticket> = {}): Ticket {
  return {
    id: toTicketId('aaaaaaaaaaaaaaaaaaaaaaaa'),
    title: 'Laptop will not boot',
    description: 'Fans spin, screen stays black after the last update.',
    status: 'open',
    priority: 'high',
    requesterId: toUserId('bbbbbbbbbbbbbbbbbbbbbbbb'),
    assigneeId: null,
    resolvedAt: null,
    closedAt: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe('ticket status transitions', () => {
  it('allows the happy path open → in_progress → resolved → closed', () => {
    expect(canTransition('open', 'in_progress')).toBe(true);
    expect(canTransition('in_progress', 'resolved')).toBe(true);
    expect(canTransition('resolved', 'closed')).toBe(true);
  });

  it('refuses to jump straight from resolved back to open', () => {
    expect(canTransition('resolved', 'open')).toBe(false);
  });

  it('only allows a closed ticket to be reopened as open', () => {
    const fromClosed = TICKET_STATUSES.filter((status) => canTransition('closed', status));
    expect(fromClosed).toEqual(['open']);
  });

  it('never allows a no-op transition to itself', () => {
    for (const status of TICKET_STATUSES) {
      expect(canTransition(status, status)).toBe(false);
    }
  });
});

describe('applyStatusChange', () => {
  const changedAt = new Date('2026-01-02T10:30:00.000Z');

  it('stamps resolvedAt when a ticket is resolved', () => {
    const resolved = applyStatusChange(ticket({ status: 'in_progress' }), 'resolved', changedAt);

    expect(resolved.status).toBe('resolved');
    expect(resolved.resolvedAt).toEqual(changedAt);
    expect(resolved.closedAt).toBeNull();
    expect(resolved.updatedAt).toEqual(changedAt);
  });

  it('stamps closedAt and keeps resolvedAt when closing a resolved ticket', () => {
    const resolved = applyStatusChange(ticket({ status: 'in_progress' }), 'resolved', changedAt);
    const closed = applyStatusChange(resolved, 'closed', changedAt);

    expect(closed.closedAt).toEqual(changedAt);
    expect(closed.resolvedAt).toEqual(changedAt);
  });

  it('clears the lifecycle stamps when a ticket is reopened', () => {
    const closed = applyStatusChange(ticket({ status: 'open' }), 'closed', changedAt);
    const reopened = applyStatusChange(closed, 'open', changedAt);

    expect(reopened.resolvedAt).toBeNull();
    expect(reopened.closedAt).toBeNull();
    expect(isActiveStatus(reopened.status)).toBe(true);
  });

  it('throws rather than silently ignoring an illegal move', () => {
    let thrown: unknown;

    try {
      applyStatusChange(ticket({ status: 'resolved' }), 'open', changedAt);
    } catch (error) {
      thrown = error;
    }

    // The guard is what the HTTP layer uses to map this to a 409, so assert on
    // that rather than on the message.
    expect(isInvalidStatusTransitionError(thrown)).toBe(true);
  });

  it('does not mutate the ticket it was given', () => {
    const original = ticket();
    applyStatusChange(original, 'in_progress', changedAt);

    expect(original.status).toBe('open');
    expect(original.updatedAt).toEqual(now);
  });
});
