import type { Ticket, TicketDto, User } from '@wyzetalk/db/types';
import { isOverdue } from '@wyzetalk/db/types';
import { toTicketUserRefDto } from '../users/user.serializer.js';

export type TicketParticipants = {
  requester: User | null;
  assignee: User | null;
}

export function toTicketDto(ticket: Ticket, participants: TicketParticipants): TicketDto {
  return {
    id: ticket.id,
    title: ticket.title,
    description: ticket.description,
    status: ticket.status,
    priority: ticket.priority,
    category: ticket.category,
    requester: participants.requester ? toTicketUserRefDto(participants.requester) : null,
    assignee: participants.assignee ? toTicketUserRefDto(participants.assignee) : null,
    dueAt: ticket.dueAt.toISOString(),
    // Derived here, once, so the client never has to re-implement the rule.
    isOverdue: isOverdue(ticket),
    resolvedAt: ticket.resolvedAt?.toISOString() ?? null,
    closedAt: ticket.closedAt?.toISOString() ?? null,
    createdAt: ticket.createdAt.toISOString(),
    updatedAt: ticket.updatedAt.toISOString(),
  };
}
