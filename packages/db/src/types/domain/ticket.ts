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

/**
 * The kind of help being asked for. Fixed list rather than free text so the
 * dashboard can group by it without cleaning up typos.
 */
export const TICKET_CATEGORIES = [
  'hardware',
  'software',
  'network',
  'access',
  'facilities',
  'other',
] as const;
export type TicketCategory = (typeof TICKET_CATEGORIES)[number];

export function isTicketCategory(value: unknown): value is TicketCategory {
  return typeof value === 'string' && (TICKET_CATEGORIES as readonly string[]).includes(value);
}

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
  readonly category: TicketCategory;
  /** Who raised it. Immutable for the life of the ticket. */
  readonly requesterId: UserId;
  /** The agent currently working it, or `null` while unassigned. */
  readonly assigneeId: UserId | null;
  /** When this should have been dealt with, derived from priority at creation. */
  readonly dueAt: Date;
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
export const DEFAULT_TICKET_CATEGORY: TicketCategory = 'other';

/**
 * How long each priority gets before it counts as overdue, in hours.
 *
 * This is the response target, not a contractual SLA — it exists so the
 * dashboard can show a real "overdue" number instead of guessing from age.
 */
export const TICKET_RESPONSE_HOURS: Record<TicketPriority, number> = {
  urgent: 4,
  high: 24,
  medium: 72,
  low: 168,
};

const HOUR_IN_MS = 60 * 60 * 1000;

/** Due date for a new ticket. Pure, and takes `now` so tests never need a fake clock. */
export function dueAtFor(priority: TicketPriority, now: Date = new Date()): Date {
  return new Date(now.getTime() + TICKET_RESPONSE_HOURS[priority] * HOUR_IN_MS);
}

/**
 * A ticket is overdue when it is still somebody's problem and its due date has
 * passed. Resolved and closed tickets are never overdue, however late they were.
 */
export function isOverdue(ticket: Ticket, now: Date = new Date()): boolean {
  return isActiveStatus(ticket.status) && ticket.dueAt.getTime() < now.getTime();
}

/** Statuses that still need somebody to act. */
export const ACTIVE_TICKET_STATUSES = ['open', 'in_progress'] as const;

export function isActiveStatus(status: TicketStatus): boolean {
  return (ACTIVE_TICKET_STATUSES as readonly TicketStatus[]).includes(status);
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

/** Everything the dashboard needs, in one payload. */
export type TicketStats = {
  readonly total: number;
  readonly byStatus: Record<TicketStatus, number>;
  readonly byPriority: Record<TicketPriority, number>;
  readonly byCategory: Record<TicketCategory, number>;
  /** Still active, past its due date. */
  readonly overdue: number;
  readonly unassigned: number;
}

export function emptyTicketStats(): TicketStats {
  return {
    total: 0,
    byStatus: { open: 0, in_progress: 0, resolved: 0, closed: 0 },
    byPriority: { low: 0, medium: 0, high: 0, urgent: 0 },
    byCategory: { hardware: 0, software: 0, network: 0, access: 0, facilities: 0, other: 0 },
    overdue: 0,
    unassigned: 0,
  };
}
