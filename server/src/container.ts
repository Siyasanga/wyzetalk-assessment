/**
 * Composition root: the one place that knows which repository implementation
 * the services get. Swap `createMongo*Repository` here and nothing else changes.
 */

import { createMongoTicketRepository, createMongoUserRepository } from '@wyzetalk/db';
import { createAuthService } from './modules/auth/auth.service.js';
import { createTicketService } from './modules/tickets/ticket.service.js';
import { createUserService } from './modules/users/user.service.js';

const userRepository = createMongoUserRepository();
const ticketRepository = createMongoTicketRepository();

export const services = {
  auth: createAuthService(userRepository),
  users: createUserService(userRepository),
  tickets: createTicketService(ticketRepository, userRepository),
};

export const repositories = {
  users: userRepository,
  tickets: ticketRepository,
};
