/**
 * Development seed: an admin, an agent, two requesters and a handful of tickets
 * spread across the lifecycle. Idempotent — existing users are reused.
 *
 *   pnpm --filter @wyzetalk/server seed
 */

import {
  connectToDatabase,
  createMongoTicketRepository,
  createMongoUserRepository,
  disconnectFromDatabase,
} from '@wyzetalk/db';
import type { TicketPriority, TicketStatus, User, UserRole } from '@wyzetalk/db/types';
import { applyStatusChange } from '@wyzetalk/db/types';
import { env } from '../config/env.js';
import { hashPassword } from '../lib/password.js';

const users = createMongoUserRepository();
const tickets = createMongoTicketRepository();

async function upsertUser(email: string, name: string, role: UserRole, password: string): Promise<User> {
  const existing = await users.findByEmail(email);
  if (existing) return existing;

  return users.create({ email, name, role, passwordHash: await hashPassword(password) });
}

type SeedTicket = {
  title: string;
  description: string;
  priority: TicketPriority;
  status: TicketStatus;
  assign: boolean;
}

const SEED_TICKETS: SeedTicket[] = [
  {
    title: 'Cannot sign in to the staff portal',
    description: 'Password reset email never arrives, tried three times this morning.',
    priority: 'high',
    status: 'open',
    assign: false,
  },
  {
    title: 'Payslip PDF downloads blank',
    description: 'The March payslip opens as an empty document on both Chrome and Safari.',
    priority: 'medium',
    status: 'in_progress',
    assign: true,
  },
  {
    title: 'Request a second monitor for the support desk',
    description: 'Handling two queues side by side needs more screen space than the laptop offers.',
    priority: 'low',
    status: 'open',
    assign: false,
  },
  {
    title: 'Shift roster notifications arriving twice',
    description: 'Every roster change sends two identical push notifications a few seconds apart.',
    priority: 'urgent',
    status: 'resolved',
    assign: true,
  },
];

async function main(): Promise<void> {
  await connectToDatabase({ uri: env.MONGODB_URI, syncIndexes: true });

  const admin = await upsertUser(env.SEED_ADMIN_EMAIL, 'Ada Admin', 'admin', env.SEED_ADMIN_PASSWORD);
  const agent = await upsertUser('agent@wyzetalk.test', 'Gale Agent', 'agent', 'Agent123!');
  const thabo = await upsertUser('thabo@wyzetalk.test', 'Thabo Requester', 'requester', 'Requester123!');
  const naledi = await upsertUser('naledi@wyzetalk.test', 'Naledi Requester', 'requester', 'Requester123!');

  const requesters = [thabo, naledi];
  let created = 0;

  for (const [index, seed] of SEED_TICKETS.entries()) {
    const requester = requesters[index % requesters.length] ?? thabo;

    const ticket = await tickets.create({
      title: seed.title,
      description: seed.description,
      priority: seed.priority,
      requesterId: requester.id,
      assigneeId: seed.assign ? agent.id : null,
    });

    // Walk the ticket to its seeded status through the real domain transitions,
    // so the lifecycle timestamps end up consistent.
    if (seed.status !== 'open') {
      const path: TicketStatus[] = seed.status === 'resolved' ? ['in_progress', 'resolved'] : [seed.status];
      let current = ticket;

      for (const step of path) {
        current = applyStatusChange(current, step);
      }

      await tickets.update(ticket.id, {
        status: current.status,
        resolvedAt: current.resolvedAt,
        closedAt: current.closedAt,
      });
    }

    created += 1;
  }

  console.log(`[seed] ready: ${created} tickets`);
  console.log(`[seed] admin     ${admin.email} / ${env.SEED_ADMIN_PASSWORD}`);
  console.log('[seed] agent     agent@wyzetalk.test / Agent123!');
  console.log('[seed] requester thabo@wyzetalk.test / Requester123!');
}

main()
  .catch((error: unknown) => {
    console.error('[seed] failed', error);
    process.exitCode = 1;
  })
  .finally(() => disconnectFromDatabase());
