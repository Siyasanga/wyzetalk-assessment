import { type Actor, type User, type UserRole, toUserId } from '@wyzetalk/db/types';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  type InMemoryTicketRepository,
  type InMemoryUserRepository,
  createInMemoryTicketRepository,
  createInMemoryUserRepository,
  nextObjectId,
} from '../../testing/in-memory-repositories.js';
import { type TicketService, createTicketService } from './ticket.service.js';

const NEW_TICKET = {
  title: 'Headset microphone not detected',
  description: 'The USB headset shows up as an output device but never as an input.',
  priority: 'medium' as const,
};

let users: InMemoryUserRepository;
let tickets: InMemoryTicketRepository;
let service: TicketService;

function addUser(name: string, role: UserRole): User {
  const now = new Date();
  const user = {
    id: toUserId(nextObjectId()),
    email: `${name.toLowerCase()}@wyzetalk.test`,
    name,
    role,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  };

  users.seed({ ...user, passwordHash: 'not-used-here' });
  return user;
}

function actorOf(user: User): Actor {
  return { id: user.id, email: user.email, role: user.role };
}

beforeEach(() => {
  users = createInMemoryUserRepository();
  tickets = createInMemoryTicketRepository();
  service = createTicketService(tickets, users);
});

describe('creating a ticket', () => {
  it('records the requester as the author and leaves it unassigned', async () => {
    const thabo = addUser('Thabo', 'requester');

    const ticket = await service.create(actorOf(thabo), { ...NEW_TICKET });

    expect(ticket.requester?.id).toBe(thabo.id);
    expect(ticket.assignee).toBeNull();
    expect(ticket.status).toBe('open');
  });

  it('lets staff raise a ticket on behalf of someone else', async () => {
    const gale = addUser('Gale', 'agent');
    const thabo = addUser('Thabo', 'requester');

    const ticket = await service.create(actorOf(gale), { ...NEW_TICKET, requesterId: thabo.id });

    expect(ticket.requester?.id).toBe(thabo.id);
  });

  it('refuses to assign a ticket to a requester', async () => {
    const gale = addUser('Gale', 'agent');
    const thabo = addUser('Thabo', 'requester');

    await expect(
      service.create(actorOf(gale), { ...NEW_TICKET, assigneeId: thabo.id }),
    ).rejects.toThrow(/agent or an admin/i);
  });
});

describe('visibility', () => {
  it('hides other requesters’ tickets behind a 404 rather than a 403', async () => {
    const thabo = addUser('Thabo', 'requester');
    const naledi = addUser('Naledi', 'requester');

    const ticket = await service.create(actorOf(thabo), { ...NEW_TICKET });

    // A 403 would confirm the ticket exists; a requester should not learn that.
    await expect(service.getById(actorOf(naledi), ticket.id)).rejects.toMatchObject({ status: 404 });
    await expect(service.getById(actorOf(thabo), ticket.id)).resolves.toBeDefined();
  });

  it('narrows a requester’s listing to their own tickets, whatever they ask for', async () => {
    const thabo = addUser('Thabo', 'requester');
    const naledi = addUser('Naledi', 'requester');
    const gale = addUser('Gale', 'agent');

    await service.create(actorOf(thabo), { ...NEW_TICKET });
    await service.create(actorOf(naledi), { ...NEW_TICKET, title: 'Second laptop battery drains fast' });

    const asRequester = await service.list(actorOf(thabo), {
      page: 1,
      limit: 20,
      sortBy: 'createdAt',
      sortOrder: 'desc',
      // Explicitly asking for someone else's tickets must not widen the scope.
      requesterId: naledi.id,
    });
    const asAgent = await service.list(actorOf(gale), {
      page: 1,
      limit: 20,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });

    expect(asRequester.total).toBe(1);
    expect(asRequester.items[0]?.requester?.id).toBe(thabo.id);
    expect(asAgent.total).toBe(2);
  });
});

describe('status changes', () => {
  it('stamps resolvedAt when an agent resolves a ticket', async () => {
    const thabo = addUser('Thabo', 'requester');
    const gale = addUser('Gale', 'agent');

    const created = await service.create(actorOf(thabo), { ...NEW_TICKET });
    await service.changeStatus(actorOf(gale), created.id, { status: 'in_progress' });
    const resolved = await service.changeStatus(actorOf(gale), created.id, { status: 'resolved' });

    expect(resolved.status).toBe('resolved');
    expect(resolved.resolvedAt).not.toBeNull();
  });

  it('rejects an illegal move through the domain rules', async () => {
    const thabo = addUser('Thabo', 'requester');
    const gale = addUser('Gale', 'agent');

    const created = await service.create(actorOf(thabo), { ...NEW_TICKET });
    await service.changeStatus(actorOf(gale), created.id, { status: 'resolved' });

    await expect(
      service.changeStatus(actorOf(gale), created.id, { status: 'open' }),
    ).rejects.toThrow(/cannot move from "resolved" to "open"/i);
  });
});

describe('assignment and deletion', () => {
  it('only lets staff assign, and only admins delete', async () => {
    const thabo = addUser('Thabo', 'requester');
    const gale = addUser('Gale', 'agent');
    const ada = addUser('Ada', 'admin');

    const created = await service.create(actorOf(thabo), { ...NEW_TICKET });

    await expect(
      service.assign(actorOf(thabo), created.id, { assigneeId: gale.id }),
    ).rejects.toMatchObject({ status: 403 });

    const assigned = await service.assign(actorOf(gale), created.id, { assigneeId: gale.id });
    expect(assigned.assignee?.id).toBe(gale.id);

    await expect(service.remove(actorOf(gale), created.id)).rejects.toMatchObject({ status: 403 });
    await expect(service.remove(actorOf(ada), created.id)).resolves.toBeUndefined();
  });
});

describe('stats', () => {
  it('counts only the requester’s own tickets for a requester', async () => {
    const thabo = addUser('Thabo', 'requester');
    const naledi = addUser('Naledi', 'requester');
    const gale = addUser('Gale', 'agent');

    await service.create(actorOf(thabo), { ...NEW_TICKET });
    await service.create(actorOf(naledi), { ...NEW_TICKET, priority: 'urgent' });

    expect((await service.stats(actorOf(thabo))).total).toBe(1);

    const all = await service.stats(actorOf(gale));
    expect(all.total).toBe(2);
    expect(all.byStatus.open).toBe(2);
    expect(all.unassigned).toBe(2);
  });
});
