import type { Page } from '../types/domain/common.js';
import { buildPage } from '../types/domain/common.js';
import type { User, UserId } from '../types/domain/user.js';
import { normalizeEmail } from '../types/domain/user.js';
import type {
  NewUser,
  UserListFilter,
  UserPatch,
  UserRepository,
  UserWithCredentials,
} from '../types/ports/user-repository.js';
import { toUser, toUserWithCredentials } from '../mappers/user.mapper.js';
import { type UserDocument, UserModel } from '../models/user.model.js';
import { escapeRegExp } from './query-utils.js';
import type { FilterQuery } from 'mongoose';

function buildQuery(filter: UserListFilter): FilterQuery<UserDocument> {
  const query: FilterQuery<UserDocument> = {};

  if (filter.role) query.role = filter.role;
  if (typeof filter.isActive === 'boolean') query.isActive = filter.isActive;
  if (filter.q) {
    const pattern = new RegExp(escapeRegExp(filter.q), 'i');
    query.$or = [{ name: pattern }, { email: pattern }];
  }

  return query;
}

export function createMongoUserRepository(): UserRepository {
  async function findById(id: UserId): Promise<User | null> {
    const doc = await UserModel.findById(id).lean<UserDocument | null>().exec();
    return doc ? toUser(doc) : null;
  }

  async function findManyByIds(ids: readonly UserId[]): Promise<User[]> {
    if (ids.length === 0) return [];

    const docs = await UserModel.find({ _id: { $in: [...new Set(ids)] } })
      .lean<UserDocument[]>()
      .exec();

    return docs.map(toUser);
  }

  /** The only query that pulls the password hash. */
  async function findByEmail(email: string): Promise<UserWithCredentials | null> {
    const doc = await UserModel.findOne({ email: normalizeEmail(email) })
      .select('+passwordHash')
      .lean<UserDocument | null>()
      .exec();

    return doc ? toUserWithCredentials(doc) : null;
  }

  async function list(filter: UserListFilter): Promise<Page<User>> {
    const query = buildQuery(filter);
    const skip = (filter.page - 1) * filter.limit;

    const [docs, total] = await Promise.all([
      UserModel.find(query).sort({ createdAt: -1 }).skip(skip).limit(filter.limit).lean<UserDocument[]>().exec(),
      UserModel.countDocuments(query).exec(),
    ]);

    return buildPage(docs.map(toUser), total, filter);
  }

  async function create(input: NewUser): Promise<User> {
    const created = await UserModel.create({
      email: normalizeEmail(input.email),
      name: input.name,
      passwordHash: input.passwordHash,
      role: input.role,
      isActive: true,
    });

    return toUser(created.toObject<UserDocument>());
  }

  async function update(id: UserId, patch: UserPatch): Promise<User | null> {
    const doc = await UserModel.findByIdAndUpdate(id, { $set: patch }, { new: true, runValidators: true })
      .lean<UserDocument | null>()
      .exec();

    return doc ? toUser(doc) : null;
  }

  async function remove(id: UserId): Promise<boolean> {
    const result = await UserModel.deleteOne({ _id: id }).exec();
    return result.deletedCount === 1;
  }

  function count(): Promise<number> {
    return UserModel.estimatedDocumentCount().exec();
  }

  return { findById, findManyByIds, findByEmail, list, create, update, delete: remove, count };
}
