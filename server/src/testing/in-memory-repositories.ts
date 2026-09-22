/**
 * In-memory implementations of the repository ports.
 *
 * The services depend on the port types from `@wyzetalk/db/types`, never on
 * Mongoose, so the whole service layer can be tested without a database.
 */

import {
  type NewTicket,
  type NewUser,
  type Page,
  type Ticket,
  type TicketId,
  type TicketListFilter,
  type TicketPatch,
  type TicketRepository,
  type TicketScope,
  type TicketStats,
  type User,
  type UserId,
  type UserListFilter,
  type UserPatch,
  type UserRepository,
  type UserWithCredentials,
  TICKET_PRIORITY_RANK,
  TICKET_STATUS_RANK,
  buildPage,
  emptyTicketStats,
  normalizeEmail,
  toTicketId,
  toUserId,
} from '@wyzetalk/db/types';

let sequence = 0;

/** Produces ids that look like the real thing, so `toUserId` accepts them. */
export function nextObjectId(): string {
  sequence += 1;
  return sequence.toString(16).padStart(24, '0');
}

/** The port plus a way to plant a row without going through `create`. */
export type InMemoryUserRepository = UserRepository & {
  seed(user: UserWithCredentials): UserWithCredentials;
};

export type InMemoryTicketRepository = TicketRepository & {
  seed(ticket: Ticket): Ticket;
};

function strip(row: UserWithCredentials | null): User | null {
  if (!row) return null;
  const { passwordHash: _passwordHash, ...user } = row;
  return user;
}

export function createInMemoryUserRepository(): InMemoryUserRepository {
  const rows = new Map<string, UserWithCredentials>();

  function seed(user: UserWithCredentials): UserWithCredentials {
    rows.set(user.id, user);
    return user;
  }

  async function findById(id: UserId): Promise<User | null> {
    return strip(rows.get(id) ?? null);
  }

  async function findManyByIds(ids: readonly UserId[]): Promise<User[]> {
    return ids
      .map((id) => rows.get(id))
      .filter((row): row is UserWithCredentials => Boolean(row))
      .map((row) => strip(row) as User);
  }

  async function findByEmail(email: string): Promise<UserWithCredentials | null> {
    const wanted = normalizeEmail(email);
    return [...rows.values()].find((row) => row.email === wanted) ?? null;
  }

  async function list(filter: UserListFilter): Promise<Page<User>> {
    let matches = [...rows.values()];

    if (filter.role) matches = matches.filter((row) => row.role === filter.role);
    if (typeof filter.isActive === 'boolean') matches = matches.filter((row) => row.isActive === filter.isActive);
    if (filter.q) {
      const needle = filter.q.toLowerCase();
      matches = matches.filter(
        (row) => row.name.toLowerCase().includes(needle) || row.email.includes(needle),
      );
    }

    const start = (filter.page - 1) * filter.limit;
    const items = matches.slice(start, start + filter.limit).map((row) => strip(row) as User);

    return buildPage(items, matches.length, filter);
  }

  async function create(input: NewUser): Promise<User> {
    const now = new Date();
    const row: UserWithCredentials = {
      id: toUserId(nextObjectId()),
      email: normalizeEmail(input.email),
      name: input.name,
      role: input.role,
      passwordHash: input.passwordHash,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };

    rows.set(row.id, row);
    return strip(row) as User;
  }

  async function update(id: UserId, patch: UserPatch): Promise<User | null> {
    const row = rows.get(id);
    if (!row) return null;

    const updated: UserWithCredentials = { ...row, ...patch, updatedAt: new Date() };
    rows.set(id, updated);

    return strip(updated) as User;
  }

  async function remove(id: UserId): Promise<boolean> {
    return rows.delete(id);
  }

  async function count(): Promise<number> {
    return rows.size;
  }

  return { seed, findById, findManyByIds, findByEmail, list, create, update, delete: remove, count };
}

export function createInMemoryTicketRepository(): InMemoryTicketRepository {
  const rows = new Map<string, Ticket>();

  function seed(ticket: Ticket): Ticket {
    rows.set(ticket.id, ticket);
    return ticket;
  }

  async function findById(id: TicketId): Promise<Ticket | null> {
    return rows.get(id) ?? null;
  }

  async function list(filter: TicketListFilter): Promise<Page<Ticket>> {
    let matches = [...rows.values()];

    if (filter.status) matches = matches.filter((row) => row.status === filter.status);
    if (filter.priority) matches = matches.filter((row) => row.priority === filter.priority);
    if (filter.requesterId) matches = matches.filter((row) => row.requesterId === filter.requesterId);
    if (filter.assigneeId) {
      matches =
        filter.assigneeId === 'unassigned'
          ? matches.filter((row) => row.assigneeId === null)
          : matches.filter((row) => row.assigneeId === filter.assigneeId);
    }
    if (filter.q) {
      const needle = filter.q.toLowerCase();
      matches = matches.filter(
        (row) =>
          row.title.toLowerCase().includes(needle) || row.description.toLowerCase().includes(needle),
      );
    }

    const direction = filter.sortOrder === 'asc' ? 1 : -1;
    matches.sort((a, b) => direction * (rank(a, filter) - rank(b, filter)));

    const start = (filter.page - 1) * filter.limit;
    return buildPage(matches.slice(start, start + filter.limit), matches.length, filter);
  }

  async function create(input: NewTicket): Promise<Ticket> {
    const now = new Date();
    const ticket: Ticket = {
      id: toTicketId(nextObjectId()),
      title: input.title,
      description: input.description,
      status: 'open',
      priority: input.priority,
      requesterId: input.requesterId,
      assigneeId: input.assigneeId,
      resolvedAt: null,
      closedAt: null,
      createdAt: now,
      updatedAt: now,
    };

    rows.set(ticket.id, ticket);
    return ticket;
  }

  async function update(id: TicketId, patch: TicketPatch): Promise<Ticket | null> {
    const row = rows.get(id);
    if (!row) return null;

    const updated: Ticket = { ...row, ...patch, updatedAt: new Date() };
    rows.set(id, updated);

    return updated;
  }

  async function remove(id: TicketId): Promise<boolean> {
    return rows.delete(id);
  }

  async function stats(scope: TicketScope = {}): Promise<TicketStats> {
    const matches = scope.requesterId
      ? [...rows.values()].filter((row) => row.requesterId === scope.requesterId)
      : [...rows.values()];

    const base = emptyTicketStats();
    const byStatus = { ...base.byStatus };
    const byPriority = { ...base.byPriority };

    for (const row of matches) {
      byStatus[row.status] += 1;
      byPriority[row.priority] += 1;
    }

    return {
      total: matches.length,
      byStatus,
      byPriority,
      unassigned: matches.filter((row) => row.assigneeId === null).length,
    };
  }

  return { seed, findById, list, create, update, delete: remove, stats };
}

function rank(ticket: Ticket, filter: TicketListFilter): number {
  switch (filter.sortBy) {
    case 'priority':
      return TICKET_PRIORITY_RANK[ticket.priority];
    case 'status':
      return TICKET_STATUS_RANK[ticket.status];
    case 'updatedAt':
      return ticket.updatedAt.getTime();
    default:
      return ticket.createdAt.getTime();
  }
}
