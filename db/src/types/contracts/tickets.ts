import { z } from 'zod';
import { TICKET_PRIORITIES, TICKET_STATUSES } from '../domain/ticket.js';
import { entityIdSchema, paginationQuerySchema, sortOrderSchema } from './common.js';
import type { UserDto } from './users.js';

export const ticketStatusSchema = z.enum(TICKET_STATUSES);
export const ticketPrioritySchema = z.enum(TICKET_PRIORITIES);

export const ticketTitleSchema = z.string().trim().min(5, 'Title is too short.').max(140);
export const ticketDescriptionSchema = z.string().trim().min(10, 'Description is too short.').max(5000);

/** A user as embedded in a ticket payload — enough to render, nothing more. */
export type TicketUserRefDto = {
  id: string;
  name: string;
  email: string;
  role: UserDto['role'];
}

export type TicketDto = {
  id: string;
  title: string;
  description: string;
  status: (typeof TICKET_STATUSES)[number];
  priority: (typeof TICKET_PRIORITIES)[number];
  requester: TicketUserRefDto | null;
  assignee: TicketUserRefDto | null;
  resolvedAt: string | null;
  closedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export const createTicketSchema = z.object({
  title: ticketTitleSchema,
  description: ticketDescriptionSchema,
  priority: ticketPrioritySchema.default('medium'),
  /** Staff may raise a ticket on behalf of someone else; requesters may not. */
  requesterId: entityIdSchema.optional(),
  assigneeId: entityIdSchema.optional(),
});
export type CreateTicketInput = z.infer<typeof createTicketSchema>;

export const updateTicketSchema = z
  .object({
    title: ticketTitleSchema.optional(),
    description: ticketDescriptionSchema.optional(),
    priority: ticketPrioritySchema.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Provide at least one field to update.',
  });
export type UpdateTicketInput = z.infer<typeof updateTicketSchema>;

/** Status moves go through their own endpoint: they are a transition, not a field write. */
export const changeTicketStatusSchema = z.object({
  status: ticketStatusSchema,
});
export type ChangeTicketStatusInput = z.infer<typeof changeTicketStatusSchema>;

/** `assigneeId: null` unassigns. */
export const assignTicketSchema = z.object({
  assigneeId: entityIdSchema.nullable(),
});
export type AssignTicketInput = z.infer<typeof assignTicketSchema>;

export const ticketSortFieldSchema = z.enum(['createdAt', 'updatedAt', 'priority', 'status']);

export const listTicketsQuerySchema = paginationQuerySchema.extend({
  status: ticketStatusSchema.optional(),
  priority: ticketPrioritySchema.optional(),
  assigneeId: z.union([entityIdSchema, z.literal('unassigned')]).optional(),
  requesterId: entityIdSchema.optional(),
  q: z.string().trim().min(1).max(140).optional(),
  sortBy: ticketSortFieldSchema.default('createdAt'),
  sortOrder: sortOrderSchema.default('desc'),
});
export type ListTicketsQuery = z.infer<typeof listTicketsQuerySchema>;

export const ticketIdParamSchema = z.object({ id: entityIdSchema });

/** Counts for the dashboard header. */
export type TicketStatsDto = {
  total: number;
  byStatus: Record<(typeof TICKET_STATUSES)[number], number>;
  byPriority: Record<(typeof TICKET_PRIORITIES)[number], number>;
  unassigned: number;
}
