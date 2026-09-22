import type { Ticket } from '../types/domain/ticket.js';
import { toTicketId } from '../types/domain/ticket.js';
import { toUserId } from '../types/domain/user.js';
import type { TicketDocument } from '../models/ticket.model.js';

export function toTicket(doc: TicketDocument): Ticket {
  return {
    id: toTicketId(doc._id.toHexString()),
    title: doc.title,
    description: doc.description,
    status: doc.status,
    priority: doc.priority,
    category: doc.category,
    requesterId: toUserId(doc.requester.toHexString()),
    assigneeId: doc.assignee ? toUserId(doc.assignee.toHexString()) : null,
    dueAt: doc.dueAt,
    resolvedAt: doc.resolvedAt,
    closedAt: doc.closedAt,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}
