import type { User } from '../types/domain/user.js';
import { toUserId } from '../types/domain/user.js';
import type { UserWithCredentials } from '../types/ports/user-repository.js';
import type { UserDocument } from '../models/user.model.js';

/** Document → domain. The boundary where Mongo types stop. */
export function toUser(doc: UserDocument): User {
  return {
    id: toUserId(doc._id.toHexString()),
    email: doc.email,
    name: doc.name,
    role: doc.role,
    isActive: doc.isActive,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export function toUserWithCredentials(doc: UserDocument): UserWithCredentials {
  return { ...toUser(doc), passwordHash: doc.passwordHash };
}
