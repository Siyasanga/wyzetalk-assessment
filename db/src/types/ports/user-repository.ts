/**
 * The contract the service layer codes against. Implemented by Mongo in this
 * package; a fake implementation is all a service unit test needs.
 */

import type { Page, PageRequest } from '../domain/common.js';
import type { User, UserId, UserRole } from '../domain/user.js';

/** A user plus the credential material — only ever loaded for a login check. */
export type UserWithCredentials = User & {
  readonly passwordHash: string;
}

export type NewUser = {
  readonly email: string;
  readonly name: string;
  readonly passwordHash: string;
  readonly role: UserRole;
}

export type UserPatch = {
  readonly name?: string;
  readonly role?: UserRole;
  readonly isActive?: boolean;
  readonly passwordHash?: string;
}

export type UserListFilter = PageRequest & {
  readonly role?: UserRole;
  readonly isActive?: boolean;
  /** Free-text match against name or email. */
  readonly q?: string;
}

export type UserRepository = {
  findById(id: UserId): Promise<User | null>;
  findManyByIds(ids: readonly UserId[]): Promise<User[]>;
  findByEmail(email: string): Promise<UserWithCredentials | null>;
  list(filter: UserListFilter): Promise<Page<User>>;
  create(input: NewUser): Promise<User>;
  update(id: UserId, patch: UserPatch): Promise<User | null>;
  delete(id: UserId): Promise<boolean>;
  count(): Promise<number>;
}
