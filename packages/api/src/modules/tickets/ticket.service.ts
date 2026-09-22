import {
  type Actor,
  type AssignTicketInput,
  type ChangeTicketStatusInput,
  type CreateTicketInput,
  type ListTicketsQuery,
  type PageDto,
  type Ticket,
  type TicketDto,
  type TicketId,
  type TicketRepository,
  type TicketStatsDto,
  type UpdateTicketInput,
  type User,
  type UserId,
  type UserRepository,
  applyStatusChange,
  canAssignTicket,
  canChangeStatus,
  canDeleteTicket,
  canEditTicket,
  canViewTicket,
  isStaff,
  roleAtLeast,
  ticketScopeFor,
  toTicketId,
  toUserId,
} from '@wyzetalk/db/types';
import { badRequestError, forbiddenError, notFoundError } from '../../lib/http-errors.js';
import { type TicketParticipants, toTicketDto } from './ticket.serializer.js';

export type TicketService = {
  list(actor: Actor, query: ListTicketsQuery): Promise<PageDto<TicketDto>>;
  stats(actor: Actor): Promise<TicketStatsDto>;
  getById(actor: Actor, rawId: string): Promise<TicketDto>;
  create(actor: Actor, input: CreateTicketInput): Promise<TicketDto>;
  update(actor: Actor, rawId: string, input: UpdateTicketInput): Promise<TicketDto>;
  changeStatus(actor: Actor, rawId: string, input: ChangeTicketStatusInput): Promise<TicketDto>;
  assign(actor: Actor, rawId: string, input: AssignTicketInput): Promise<TicketDto>;
  remove(actor: Actor, rawId: string): Promise<void>;
};

/**
 * Ticket use-cases.
 *
 * The rules themselves (who may see what, which status moves are legal) live in
 * the domain; this orchestrates them around the repositories and decides what
 * the HTTP layer gets back.
 */
export function createTicketService(
  tickets: TicketRepository,
  users: UserRepository,
): TicketService {
  async function requireTicket(id: TicketId): Promise<Ticket> {
    const ticket = await tickets.findById(id);
    if (!ticket) throw notFoundError('Ticket');
    return ticket;
  }

  async function requireUser(id: UserId, label: string): Promise<User> {
    const user = await users.findById(id);
    if (!user) throw badRequestError(`${label} ${id} does not exist.`);
    return user;
  }

  /** Tickets are worked by staff, so only an agent or admin may hold one. */
  async function requireAssignable(id: UserId): Promise<UserId> {
    const user = await requireUser(id, 'Assignee');

    if (!roleAtLeast(user.role, 'agent')) {
      throw badRequestError('Only an agent or an admin can be assigned a ticket.');
    }
    if (!user.isActive) {
      throw badRequestError('That account is deactivated and cannot take tickets.');
    }

    return user.id;
  }

  /** One lookup for the whole page rather than two per ticket. */
  async function hydrateMany(page: readonly Ticket[]): Promise<TicketDto[]> {
    if (page.length === 0) return [];

    const ids = page.flatMap((ticket) =>
      ticket.assigneeId ? [ticket.requesterId, ticket.assigneeId] : [ticket.requesterId],
    );
    const people = new Map(
      (await users.findManyByIds(ids)).map((user) => [user.id as string, user]),
    );

    return page.map((ticket) =>
      toTicketDto(ticket, {
        requester: people.get(ticket.requesterId) ?? null,
        assignee: ticket.assigneeId ? (people.get(ticket.assigneeId) ?? null) : null,
      }),
    );
  }

  async function hydrate(ticket: Ticket): Promise<TicketDto> {
    const ids = ticket.assigneeId ? [ticket.requesterId, ticket.assigneeId] : [ticket.requesterId];
    const people = await users.findManyByIds(ids);

    const participants: TicketParticipants = {
      requester: people.find((user) => user.id === ticket.requesterId) ?? null,
      assignee: ticket.assigneeId
        ? (people.find((user) => user.id === ticket.assigneeId) ?? null)
        : null,
    };

    return toTicketDto(ticket, participants);
  }

  async function list(actor: Actor, query: ListTicketsQuery): Promise<PageDto<TicketDto>> {
    const scope = ticketScopeFor(actor);

    const page = await tickets.list({
      page: query.page,
      limit: query.limit,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
      ...(query.status ? { status: query.status } : {}),
      ...(query.priority ? { priority: query.priority } : {}),
      ...(query.assigneeId
        ? { assigneeId: query.assigneeId === 'unassigned' ? 'unassigned' : toUserId(query.assigneeId) }
        : {}),
      ...(query.q ? { q: query.q } : {}),
      // A requester's scope always wins over whatever they asked for.
      ...(scope ? { requesterId: scope.requesterId } : query.requesterId ? { requesterId: toUserId(query.requesterId) } : {}),
    });

    const items = await hydrateMany(page.items);

    return {
      items,
      total: page.total,
      page: page.page,
      limit: page.limit,
      pageCount: page.pageCount,
    };
  }

  async function stats(actor: Actor): Promise<TicketStatsDto> {
    const scope = ticketScopeFor(actor);
    return tickets.stats(scope ?? {});
  }

  async function getById(actor: Actor, rawId: string): Promise<TicketDto> {
    const ticket = await requireTicket(toTicketId(rawId));
    if (!canViewTicket(actor, ticket)) throw notFoundError('Ticket');

    return hydrate(ticket);
  }

  async function create(actor: Actor, input: CreateTicketInput): Promise<TicketDto> {
    // Staff can raise a ticket on someone's behalf; a requester is always their own requester.
    const requesterId =
      input.requesterId && isStaff(actor) ? toUserId(input.requesterId) : actor.id;

    if (input.requesterId && !isStaff(actor) && toUserId(input.requesterId) !== actor.id) {
      throw forbiddenError('You can only raise tickets in your own name.');
    }

    await requireUser(requesterId, 'Requester');

    let assigneeId: UserId | null = null;
    if (input.assigneeId) {
      if (!canAssignTicket(actor)) throw forbiddenError('Only staff can assign a ticket.');
      assigneeId = await requireAssignable(toUserId(input.assigneeId));
    }

    const ticket = await tickets.create({
      title: input.title,
      description: input.description,
      priority: input.priority,
      requesterId,
      assigneeId,
    });

    return hydrate(ticket);
  }

  async function update(actor: Actor, rawId: string, input: UpdateTicketInput): Promise<TicketDto> {
    const ticket = await requireTicket(toTicketId(rawId));

    if (!canViewTicket(actor, ticket)) throw notFoundError('Ticket');
    if (!canEditTicket(actor, ticket)) {
      throw forbiddenError('This ticket can no longer be edited.');
    }

    const updated = await tickets.update(ticket.id, input);
    if (!updated) throw notFoundError('Ticket');

    return hydrate(updated);
  }

  /** The status machine lives in the domain; this persists whatever it produces. */
  async function changeStatus(
    actor: Actor,
    rawId: string,
    input: ChangeTicketStatusInput,
  ): Promise<TicketDto> {
    const ticket = await requireTicket(toTicketId(rawId));

    if (!canViewTicket(actor, ticket)) throw notFoundError('Ticket');
    if (!canChangeStatus(actor, ticket)) {
      throw forbiddenError('You cannot change the status of this ticket.');
    }

    // Throws an InvalidStatusTransitionError (→ 409) on an illegal move.
    const next = applyStatusChange(ticket, input.status);

    const updated = await tickets.update(ticket.id, {
      status: next.status,
      resolvedAt: next.resolvedAt,
      closedAt: next.closedAt,
    });
    if (!updated) throw notFoundError('Ticket');

    return hydrate(updated);
  }

  async function assign(actor: Actor, rawId: string, input: AssignTicketInput): Promise<TicketDto> {
    if (!canAssignTicket(actor)) throw forbiddenError('Only staff can assign a ticket.');

    const ticket = await requireTicket(toTicketId(rawId));
    const assigneeId = input.assigneeId ? await requireAssignable(toUserId(input.assigneeId)) : null;

    const updated = await tickets.update(ticket.id, { assigneeId });
    if (!updated) throw notFoundError('Ticket');

    return hydrate(updated);
  }

  async function remove(actor: Actor, rawId: string): Promise<void> {
    if (!canDeleteTicket(actor)) throw forbiddenError('Only an admin can delete a ticket.');

    const deleted = await tickets.delete(toTicketId(rawId));
    if (!deleted) throw notFoundError('Ticket');
  }

  return { list, stats, getById, create, update, changeStatus, assign, remove };
}
