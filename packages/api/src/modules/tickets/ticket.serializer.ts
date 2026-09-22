import type { Ticket, TicketDto, User } from '@wyzetalk/db/types';
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
    requester: participants.requester ? toTicketUserRefDto(participants.requester) : null,
    assignee: participants.assignee ? toTicketUserRefDto(participants.assignee) : null,
    resolvedAt: ticket.resolvedAt?.toISOString() ?? null,
    closedAt: ticket.closedAt?.toISOString() ?? null,
    createdAt: ticket.createdAt.toISOString(),
    updatedAt: ticket.updatedAt.toISOString(),
  };
}
