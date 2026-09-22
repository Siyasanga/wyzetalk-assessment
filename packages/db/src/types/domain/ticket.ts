import { type Brand, type Timestamped, isEntityId } from './common.js';
import { invalidIdError, invalidStatusTransitionError } from './errors.js';
import type { UserId } from './user.js';

export type TicketId = Brand<string, 'TicketId'>;

export function toTicketId(value: unknown): TicketId {
  if (!isEntityId(value)) throw invalidIdError(value, 'ticket id');
  return value as TicketId;
}

export const TICKET_STATUSES = ['open', 'in_progress', 'resolved', 'closed'] as const;
export type TicketStatus = (typeof TICKET_STATUSES)[number];

export const TICKET_PRIORITIES = ['low', 'medium', 'high', 'urgent'] as const;
export type TicketPriority = (typeof TICKET_PRIORITIES)[number];

export function isTicketStatus(value: unknown): value is TicketStatus {
  return typeof value === 'string' && (TICKET_STATUSES as readonly string[]).includes(value);
}

export function isTicketPriority(value: unknown): value is TicketPriority {
  return typeof value === 'string' && (TICKET_PRIORITIES as readonly string[]).includes(value);
}

export type Ticket = Timestamped & {
  readonly id: TicketId;
  readonly title: string;
  readonly description: string;
  readonly status: TicketStatus;
  readonly priority: TicketPriority;
  /** Who raised it. Immutable for the life of the ticket. */
  readonly requesterId: UserId;
  /** The agent currently working it, or `null` while unassigned. */
  readonly assigneeId: UserId | null;
  readonly resolvedAt: Date | null;
  readonly closedAt: Date | null;
}

/**
 * The ticket lifecycle, as a table rather than a pile of `if`s.
 *
 *   open ⇄ in_progress → resolved → closed
 *                ↑__________|         |
 *   closed can only be reopened to `open`.
 */
export const TICKET_STATUS_TRANSITIONS: Record<TicketStatus, readonly TicketStatus[]> = {
  open: ['in_progress', 'resolved', 'closed'],
  in_progress: ['open', 'resolved', 'closed'],
  resolved: ['in_progress', 'closed'],
  closed: ['open'],
};

/**
 * Explicit ordering for sorting. Alphabetical order on the enum values is
 * meaningless ("high" < "low"), so both the API and the client rank with these.
 */
export const TICKET_PRIORITY_RANK: Record<TicketPriority, number> = {
  low: 1,
  medium: 2,
  high: 3,
  urgent: 4,
};

export const TICKET_STATUS_RANK: Record<TicketStatus, number> = {
  open: 1,
  in_progress: 2,
  resolved: 3,
  closed: 4,
};

export const DEFAULT_TICKET_STATUS: TicketStatus = 'open';
export const DEFAULT_TICKET_PRIORITY: TicketPriority = 'medium';

/** Statuses that still need somebody to act. */
export function isActiveStatus(status: TicketStatus): boolean {
  return status === 'open' || status === 'in_progress';
}

export function canTransition(from: TicketStatus, to: TicketStatus): boolean {
  return TICKET_STATUS_TRANSITIONS[from].includes(to);
}

export function assertTransition(from: TicketStatus, to: TicketStatus): void {
  if (!canTransition(from, to)) throw invalidStatusTransitionError(from, to);
}

/**
 * Pure state change: validates the move and keeps the lifecycle timestamps
 * consistent with the new status. Persistence just writes what comes back.
 */
export function applyStatusChange(ticket: Ticket, next: TicketStatus, now: Date = new Date()): Ticket {
  assertTransition(ticket.status, next);

  return {
    ...ticket,
    status: next,
    resolvedAt: next === 'resolved' ? now : isActiveStatus(next) ? null : ticket.resolvedAt,
    closedAt: next === 'closed' ? now : isActiveStatus(next) ? null : ticket.closedAt,
    updatedAt: now,
  };
}

/** Aggregate counts over a set of tickets, for the dashboard header. */
export type TicketStats = {
  readonly total: number;
  readonly byStatus: Record<TicketStatus, number>;
  readonly byPriority: Record<TicketPriority, number>;
  readonly unassigned: number;
}

export function emptyTicketStats(): TicketStats {
  return {
    total: 0,
    byStatus: { open: 0, in_progress: 0, resolved: 0, closed: 0 },
    byPriority: { low: 0, medium: 0, high: 0, urgent: 0 },
    unassigned: 0,
  };
}
