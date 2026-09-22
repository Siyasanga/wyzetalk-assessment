import { type Brand, type Timestamped, isEntityId } from './common.js';
import { invalidIdError } from './errors.js';

export type UserId = Brand<string, 'UserId'>;

export function toUserId(value: unknown): UserId {
  if (!isEntityId(value)) throw invalidIdError(value, 'user id');
  return value as UserId;
}

/**
 * Roles are ordered least → most privileged; `roleAtLeast` relies on that order.
 *
 * - `requester` raises tickets and only ever sees their own.
 * - `agent` works the queue: sees everything, can be assigned, changes status.
 * - `admin` additionally manages users and deletes tickets.
 */
export const USER_ROLES = ['requester', 'agent', 'admin'] as const;

export type UserRole = (typeof USER_ROLES)[number];

export function isUserRole(value: unknown): value is UserRole {
  return typeof value === 'string' && (USER_ROLES as readonly string[]).includes(value);
}

export function roleAtLeast(role: UserRole, minimum: UserRole): boolean {
  return USER_ROLES.indexOf(role) >= USER_ROLES.indexOf(minimum);
}

/** A user as the domain knows them. Credentials never appear here. */
export type User = Timestamped & {
  readonly id: UserId;
  readonly email: string;
  readonly name: string;
  readonly role: UserRole;
  readonly isActive: boolean;
}

/** The subset of a user carried on an authenticated request. */
export type Actor = {
  readonly id: UserId;
  readonly email: string;
  readonly role: UserRole;
}

export function toActor(user: User): Actor {
  return { id: user.id, email: user.email, role: user.role };
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
