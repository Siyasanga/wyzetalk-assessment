import {
  DEFAULT_TICKET_CATEGORY,
  DEFAULT_TICKET_PRIORITY,
  DEFAULT_TICKET_STATUS,
  TICKET_CATEGORIES,
  TICKET_PRIORITIES,
  TICKET_PRIORITY_RANK,
  TICKET_STATUSES,
  TICKET_STATUS_RANK,
  type TicketCategory,
  type TicketPriority,
  type TicketStatus,
} from '../types/domain/ticket.js';
import { Schema, type Types, model } from 'mongoose';

export type TicketDocument = {
  _id: Types.ObjectId;
  title: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  category: TicketCategory;
  requester: Types.ObjectId;
  assignee: Types.ObjectId | null;
  dueAt: Date;
  resolvedAt: Date | null;
  closedAt: Date | null;
  /** Derived from `priority` / `status` on every write, purely so Mongo can sort meaningfully. */
  priorityRank: number;
  statusRank: number;
  createdAt: Date;
  updatedAt: Date;
}

const ticketSchema = new Schema<TicketDocument>(
  {
    title: { type: String, required: true, trim: true, minlength: 5, maxlength: 140 },
    description: { type: String, required: true, trim: true, minlength: 10, maxlength: 5000 },
    status: {
      type: String,
      required: true,
      enum: TICKET_STATUSES,
      default: DEFAULT_TICKET_STATUS,
    },
    priority: {
      type: String,
      required: true,
      enum: TICKET_PRIORITIES,
      default: DEFAULT_TICKET_PRIORITY,
    },
    category: {
      type: String,
      required: true,
      enum: TICKET_CATEGORIES,
      default: DEFAULT_TICKET_CATEGORY,
      index: true,
    },
    requester: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    assignee: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    dueAt: { type: Date, required: true },
    resolvedAt: { type: Date, default: null },
    closedAt: { type: Date, default: null },
    priorityRank: { type: Number, required: true, default: TICKET_PRIORITY_RANK[DEFAULT_TICKET_PRIORITY] },
    statusRank: { type: Number, required: true, default: TICKET_STATUS_RANK[DEFAULT_TICKET_STATUS] },
  },
  { timestamps: true, versionKey: false },
);

// The queue view: filter by status/priority, newest first.
ticketSchema.index({ status: 1, priority: 1, createdAt: -1 });
// "My tickets" for a requester, and "assigned to me" for an agent.
ticketSchema.index({ requester: 1, createdAt: -1 });
ticketSchema.index({ assignee: 1, status: 1 });
// Sorting the queue by urgency.
ticketSchema.index({ priorityRank: -1, createdAt: -1 });
// The dashboard's overdue count: active tickets whose due date has passed.
ticketSchema.index({ status: 1, dueAt: 1 });

export const TicketModel = model<TicketDocument>('Ticket', ticketSchema);
