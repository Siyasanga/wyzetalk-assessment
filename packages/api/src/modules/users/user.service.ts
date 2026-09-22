import {
  type CreateUserInput,
  type ListUsersQuery,
  type PageDto,
  type UpdateUserInput,
  type Actor,
  type User,
  type UserDto,
  type UserId,
  type UserRepository,
  canManageUsers,
  canViewUser,
  normalizeEmail,
  toUserId,
} from '@wyzetalk/db/types';
import { conflictError, forbiddenError, notFoundError } from '../../lib/http-errors.js';
import { hashPassword } from '../../lib/password.js';
import { toUserDto } from './user.serializer.js';

export type UserService = {
  list(actor: Actor, query: ListUsersQuery): Promise<PageDto<UserDto>>;
  getById(actor: Actor, rawId: string): Promise<UserDto>;
  create(actor: Actor, input: CreateUserInput): Promise<UserDto>;
  update(actor: Actor, rawId: string, input: UpdateUserInput): Promise<UserDto>;
  remove(actor: Actor, rawId: string): Promise<void>;
};

/**
 * User use-cases. Depends on the repository *port*, so a unit test can hand it
 * an in-memory fake instead of a Mongo connection.
 */
export function createUserService(users: UserRepository): UserService {
  async function requireUser(id: UserId): Promise<User> {
    const user = await users.findById(id);
    if (!user) throw notFoundError('User');
    return user;
  }

  async function list(actor: Actor, query: ListUsersQuery): Promise<PageDto<UserDto>> {
    if (!canManageUsers(actor)) throw forbiddenError('Only an admin can list users.');

    const page = await users.list({
      page: query.page,
      limit: query.limit,
      ...(query.role ? { role: query.role } : {}),
      ...(typeof query.isActive === 'boolean' ? { isActive: query.isActive } : {}),
      ...(query.q ? { q: query.q } : {}),
    });

    return {
      items: page.items.map(toUserDto),
      total: page.total,
      page: page.page,
      limit: page.limit,
      pageCount: page.pageCount,
    };
  }

  async function getById(actor: Actor, rawId: string): Promise<UserDto> {
    const id = toUserId(rawId);
    if (!canViewUser(actor, id)) throw forbiddenError();

    return toUserDto(await requireUser(id));
  }

  /** Admin-only: this is how agents and other admins come into being. */
  async function create(actor: Actor, input: CreateUserInput): Promise<UserDto> {
    if (!canManageUsers(actor)) throw forbiddenError('Only an admin can create users.');

    const email = normalizeEmail(input.email);
    if (await users.findByEmail(email)) {
      throw conflictError('A user with that email address already exists.');
    }

    const user = await users.create({
      email,
      name: input.name,
      role: input.role,
      passwordHash: await hashPassword(input.password),
    });

    return toUserDto(user);
  }

  async function update(actor: Actor, rawId: string, input: UpdateUserInput): Promise<UserDto> {
    const id = toUserId(rawId);
    const isSelf = actor.id === id;

    if (!canManageUsers(actor) && !isSelf) throw forbiddenError();

    // Only an admin may change a role or deactivate an account — otherwise any
    // requester could promote themselves.
    if (!canManageUsers(actor) && (input.role !== undefined || input.isActive !== undefined)) {
      throw forbiddenError('Only an admin can change a role or account status.');
    }

    await requireUser(id);

    const updated = await users.update(id, input);
    if (!updated) throw notFoundError('User');

    return toUserDto(updated);
  }

  async function remove(actor: Actor, rawId: string): Promise<void> {
    if (!canManageUsers(actor)) throw forbiddenError('Only an admin can delete users.');

    const id = toUserId(rawId);
    if (actor.id === id) throw conflictError('You cannot delete your own account.');

    const deleted = await users.delete(id);
    if (!deleted) throw notFoundError('User');
  }

  return { list, getById, create, update, remove };
}
