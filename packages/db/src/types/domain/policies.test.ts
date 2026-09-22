import { describe, expect, it } from 'vitest';
import {
  canAssignTicket,
  canDeleteTicket,
  canEditTicket,
  canViewTicket,
  ticketScopeFor,
} from './policies.js';
import { type Ticket, toTicketId } from './ticket.js';
import { type Actor, type UserRole, toUserId } from './user.js';

const requesterId = toUserId('bbbbbbbbbbbbbbbbbbbbbbbb');
const strangerId = toUserId('cccccccccccccccccccccccc');

function actor(role: UserRole, id = requesterId): Actor {
  return { id, role, email: `${role}@example.com` };
}

function ticket(overrides: Partial<Ticket> = {}): Ticket {
  const now = new Date('2026-01-01T09:00:00.000Z');
  return {
    id: toTicketId('aaaaaaaaaaaaaaaaaaaaaaaa'),
    title: 'VPN drops every few minutes',
    description: 'Disconnects roughly every five minutes on the office wifi.',
    status: 'open',
    priority: 'medium',
    requesterId,
    assigneeId: null,
    resolvedAt: null,
    closedAt: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe('ticket visibility', () => {
  it('scopes a requester to their own tickets and leaves staff unscoped', () => {
    expect(ticketScopeFor(actor('requester'))).toEqual({ requesterId });
    expect(ticketScopeFor(actor('agent'))).toBeNull();
    expect(ticketScopeFor(actor('admin'))).toBeNull();
  });

  it('hides other people’s tickets from a requester', () => {
    expect(canViewTicket(actor('requester', strangerId), ticket())).toBe(false);
    expect(canViewTicket(actor('requester'), ticket())).toBe(true);
    expect(canViewTicket(actor('agent', strangerId), ticket())).toBe(true);
  });
});

describe('ticket mutation rights', () => {
  it('lets a requester edit their own ticket only while it is still active', () => {
    expect(canEditTicket(actor('requester'), ticket({ status: 'open' }))).toBe(true);
    expect(canEditTicket(actor('requester'), ticket({ status: 'resolved' }))).toBe(false);
    expect(canEditTicket(actor('agent', strangerId), ticket({ status: 'resolved' }))).toBe(true);
  });

  it('reserves assignment for staff and deletion for admins', () => {
    expect(canAssignTicket(actor('requester'))).toBe(false);
    expect(canAssignTicket(actor('agent'))).toBe(true);
    expect(canDeleteTicket(actor('agent'))).toBe(false);
    expect(canDeleteTicket(actor('admin'))).toBe(true);
  });
});
