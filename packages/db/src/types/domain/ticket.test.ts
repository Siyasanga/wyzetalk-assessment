import { describe, expect, it } from 'vitest';
import { isInvalidStatusTransitionError } from './errors.js';
import {
  TICKET_STATUSES,
  dueAtFor,
  isOverdue,
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
    category: 'hardware',
    dueAt: new Date('2026-01-02T09:00:00.000Z'),
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

describe('overdue', () => {
  const due = new Date('2026-01-10T09:00:00.000Z');
  const before = new Date('2026-01-09T09:00:00.000Z');
  const after = new Date('2026-01-11T09:00:00.000Z');

  it('derives the due date from the priority, not from a stored flag', () => {
    const raisedAt = new Date('2026-01-01T00:00:00.000Z');

    // urgent 4h, high 24h, medium 72h, low 168h
    expect(dueAtFor('urgent', raisedAt).toISOString()).toBe('2026-01-01T04:00:00.000Z');
    expect(dueAtFor('high', raisedAt).toISOString()).toBe('2026-01-02T00:00:00.000Z');
    expect(dueAtFor('low', raisedAt).toISOString()).toBe('2026-01-08T00:00:00.000Z');
  });

  it('is overdue only once the due date has passed', () => {
    const active = ticket({ status: 'open', dueAt: due });

    expect(isOverdue(active, before)).toBe(false);
    expect(isOverdue(active, after)).toBe(true);
  });

  it('never counts a resolved or closed ticket as overdue, however late it was', () => {
    expect(isOverdue(ticket({ status: 'resolved', dueAt: due }), after)).toBe(false);
    expect(isOverdue(ticket({ status: 'closed', dueAt: due }), after)).toBe(false);
    expect(isOverdue(ticket({ status: 'in_progress', dueAt: due }), after)).toBe(true);
  });
});
