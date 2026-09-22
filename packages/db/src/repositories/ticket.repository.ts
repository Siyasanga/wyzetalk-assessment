import type { FilterQuery, SortOrder } from 'mongoose';
import { Types } from 'mongoose';
import type { Page } from '../types/domain/common.js';
import { buildPage } from '../types/domain/common.js';
import type {
  Ticket,
  TicketCategory,
  TicketId,
  TicketPriority,
  TicketStats,
  TicketStatus,
} from '../types/domain/ticket.js';
import {
  ACTIVE_TICKET_STATUSES,
  isTicketCategory,
  isTicketPriority,
  isTicketStatus,
  TICKET_PRIORITY_RANK,
  TICKET_STATUS_RANK,
  dueAtFor,
  emptyTicketStats,
} from '../types/domain/ticket.js';
import type {
  NewTicket,
  TicketListFilter,
  TicketPatch,
  TicketRepository,
  TicketScope,
  TicketSortField,
} from '../types/ports/ticket-repository.js';
import { toTicket } from '../mappers/ticket.mapper.js';
import { type TicketDocument, TicketModel } from '../models/ticket.model.js';
import { escapeRegExp } from './query-utils.js';

/** Contract sort fields → the document fields that actually sort correctly. */
const SORT_FIELDS: Record<TicketSortField, keyof TicketDocument> = {
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  priority: 'priorityRank',
  status: 'statusRank',
  dueAt: 'dueAt',
};

type CountBucket<T extends string> = {
  _id: T;
  count: number;
}

function buildQuery(filter: TicketListFilter): FilterQuery<TicketDocument> {
  const query: FilterQuery<TicketDocument> = {};

  if (filter.status) query.status = filter.status;
  if (filter.priority) query.priority = filter.priority;
  if (filter.category) query.category = filter.category;

  // Overdue is a derived state, not a stored flag: still active, due date passed.
  if (filter.overdue) {
    query.status = filter.status ?? { $in: [...ACTIVE_TICKET_STATUSES] };
    query.dueAt = { $lt: new Date() };
  }
  if (filter.requesterId) query.requester = new Types.ObjectId(filter.requesterId);

  if (filter.assigneeId) {
    query.assignee =
      filter.assigneeId === 'unassigned' ? null : new Types.ObjectId(filter.assigneeId);
  }

  if (filter.q) {
    const pattern = new RegExp(escapeRegExp(filter.q), 'i');
    query.$or = [{ title: pattern }, { description: pattern }];
  }

  return query;
}

export function createMongoTicketRepository(): TicketRepository {
  async function findById(id: TicketId): Promise<Ticket | null> {
    const doc = await TicketModel.findById(id).lean<TicketDocument | null>().exec();
    return doc ? toTicket(doc) : null;
  }

  async function list(filter: TicketListFilter): Promise<Page<Ticket>> {
    const query = buildQuery(filter);
    const sortField = SORT_FIELDS[filter.sortBy ?? 'createdAt'];
    const direction: SortOrder = filter.sortOrder === 'asc' ? 1 : -1;
    const skip = (filter.page - 1) * filter.limit;

    const [docs, total] = await Promise.all([
      TicketModel.find(query)
        // `_id` breaks ties so pagination stays stable across pages.
        .sort({ [sortField]: direction, _id: -1 })
        .skip(skip)
        .limit(filter.limit)
        .lean<TicketDocument[]>()
        .exec(),
      TicketModel.countDocuments(query).exec(),
    ]);

    return buildPage(docs.map(toTicket), total, filter);
  }

  async function create(input: NewTicket): Promise<Ticket> {
    const created = await TicketModel.create({
      title: input.title,
      description: input.description,
      priority: input.priority,
      priorityRank: TICKET_PRIORITY_RANK[input.priority],
      category: input.category,
      // Derived once, at creation, from the priority the requester chose.
      dueAt: dueAtFor(input.priority),
      requester: new Types.ObjectId(input.requesterId),
      assignee: input.assigneeId ? new Types.ObjectId(input.assigneeId) : null,
    });

    return toTicket(created.toObject<TicketDocument>());
  }

  async function update(id: TicketId, patch: TicketPatch): Promise<Ticket | null> {
    const changes: Record<string, unknown> = {};

    if (patch.title !== undefined) changes.title = patch.title;
    if (patch.description !== undefined) changes.description = patch.description;
    if (patch.category !== undefined) changes.category = patch.category;
    if (patch.dueAt !== undefined) changes.dueAt = patch.dueAt;
    if (patch.resolvedAt !== undefined) changes.resolvedAt = patch.resolvedAt;
    if (patch.closedAt !== undefined) changes.closedAt = patch.closedAt;

    if (patch.priority !== undefined) {
      changes.priority = patch.priority;
      changes.priorityRank = TICKET_PRIORITY_RANK[patch.priority];
    }

    if (patch.status !== undefined) {
      changes.status = patch.status;
      changes.statusRank = TICKET_STATUS_RANK[patch.status];
    }

    if (patch.assigneeId !== undefined) {
      changes.assignee = patch.assigneeId ? new Types.ObjectId(patch.assigneeId) : null;
    }

    if (Object.keys(changes).length === 0) return findById(id);

    const doc = await TicketModel.findByIdAndUpdate(id, { $set: changes }, { new: true, runValidators: true })
      .lean<TicketDocument | null>()
      .exec();

    return doc ? toTicket(doc) : null;
  }

  async function remove(id: TicketId): Promise<boolean> {
    const result = await TicketModel.deleteOne({ _id: id }).exec();
    return result.deletedCount === 1;
  }

  async function stats(scope: TicketScope = {}): Promise<TicketStats> {
    const match: FilterQuery<TicketDocument> = scope.requesterId
      ? { requester: new Types.ObjectId(scope.requesterId) }
      : {};

    const [statusBuckets, priorityBuckets, categoryBuckets, overdue, unassigned, total] = await Promise.all([
      TicketModel.aggregate<CountBucket<TicketStatus>>([
        { $match: match },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]).exec(),
      TicketModel.aggregate<CountBucket<TicketPriority>>([
        { $match: match },
        { $group: { _id: '$priority', count: { $sum: 1 } } },
      ]).exec(),
      TicketModel.aggregate<CountBucket<TicketCategory>>([
        { $match: match },
        { $group: { _id: '$category', count: { $sum: 1 } } },
      ]).exec(),
      TicketModel.countDocuments({
        ...match,
        status: { $in: [...ACTIVE_TICKET_STATUSES] },
        dueAt: { $lt: new Date() },
      }).exec(),
      TicketModel.countDocuments({ ...match, assignee: null }).exec(),
      TicketModel.countDocuments(match).exec(),
    ]);

    const base = emptyTicketStats();
    const byStatus = { ...base.byStatus };
    const byPriority = { ...base.byPriority };
    const byCategory = { ...base.byCategory };

    // A document written before a field existed groups under `null`. Guarding
    // here keeps that out of a typed Record instead of inventing a "null" key.
    for (const bucket of statusBuckets) {
      if (isTicketStatus(bucket._id)) byStatus[bucket._id] = bucket.count;
    }
    for (const bucket of priorityBuckets) {
      if (isTicketPriority(bucket._id)) byPriority[bucket._id] = bucket.count;
    }
    for (const bucket of categoryBuckets) {
      if (isTicketCategory(bucket._id)) byCategory[bucket._id] = bucket.count;
    }

    return { total, byStatus, byPriority, byCategory, overdue, unassigned };
  }

  return { findById, list, create, update, delete: remove, stats };
}
