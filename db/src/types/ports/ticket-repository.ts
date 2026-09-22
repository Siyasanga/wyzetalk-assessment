import type { Page, PageRequest } from '../domain/common.js';
import type { Ticket, TicketId, TicketPriority, TicketStats, TicketStatus } from '../domain/ticket.js';
import type { UserId } from '../domain/user.js';

export type NewTicket = {
  readonly title: string;
  readonly description: string;
  readonly priority: TicketPriority;
  readonly requesterId: UserId;
  readonly assigneeId: UserId | null;
}

/**
 * Field-level writes. Status moves are expressed here too, but only the service
 * layer may build one — it runs `applyStatusChange` first so the lifecycle
 * stamps stay consistent.
 */
export type TicketPatch = {
  readonly title?: string;
  readonly description?: string;
  readonly priority?: TicketPriority;
  readonly assigneeId?: UserId | null;
  readonly status?: TicketStatus;
  readonly resolvedAt?: Date | null;
  readonly closedAt?: Date | null;
}

export type TicketSortField = 'createdAt' | 'updatedAt' | 'priority' | 'status';

/** `'unassigned'` matches tickets with no assignee. */
export type AssigneeFilter = UserId | 'unassigned';

export type TicketListFilter = PageRequest & {
  readonly status?: TicketStatus;
  readonly priority?: TicketPriority;
  readonly assigneeId?: AssigneeFilter;
  readonly requesterId?: UserId;
  readonly q?: string;
  readonly sortBy?: TicketSortField;
  readonly sortOrder?: 'asc' | 'desc';
}

/** Narrows a listing or an aggregate to what the caller is allowed to see. */
export type TicketScope = {
  readonly requesterId?: UserId;
}

export type TicketRepository = {
  findById(id: TicketId): Promise<Ticket | null>;
  list(filter: TicketListFilter): Promise<Page<Ticket>>;
  create(input: NewTicket): Promise<Ticket>;
  update(id: TicketId, patch: TicketPatch): Promise<Ticket | null>;
  delete(id: TicketId): Promise<boolean>;
  stats(scope?: TicketScope): Promise<TicketStats>;
}
