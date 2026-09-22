/**
 * `@wyzetalk/db` — server-only entry point: the connection, the models and the
 * repository implementations. Everything framework-free is re-exported from
 * `@wyzetalk/db/types`, which the browser bundle uses.
 */

export * from './connection.js';
export * from './health.js';
export * from './errors.js';

export { UserModel, type UserDocument } from './models/user.model.js';
export { TicketModel, type TicketDocument } from './models/ticket.model.js';

export { toUser, toUserWithCredentials } from './mappers/user.mapper.js';
export { toTicket } from './mappers/ticket.mapper.js';

export { createMongoUserRepository } from './repositories/user.repository.js';
export { createMongoTicketRepository } from './repositories/ticket.repository.js';
