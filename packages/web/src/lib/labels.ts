import {
  TICKET_CATEGORIES,
  TICKET_PRIORITIES,
  TICKET_STATUSES,
  type TicketCategory,
  type TicketPriority,
  type TicketStatus,
} from '@wyzetalk/db/types';

/** The enums come from the shared contracts; only their wording lives here. */
export const PRIORITY_LABELS: Record<TicketPriority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  urgent: 'Urgent',
};

export const STATUS_LABELS: Record<TicketStatus, string> = {
  open: 'Open',
  in_progress: 'In progress',
  resolved: 'Resolved',
  closed: 'Closed',
};

export const CATEGORY_LABELS: Record<TicketCategory, string> = {
  hardware: 'Hardware',
  software: 'Software',
  network: 'Network',
  access: 'Access',
  facilities: 'Facilities',
  other: 'Other',
};

export const CATEGORY_OPTIONS = TICKET_CATEGORIES.map((value) => ({
  value,
  label: CATEGORY_LABELS[value],
}));

export const PRIORITY_OPTIONS = TICKET_PRIORITIES.map((value) => ({
  value,
  label: PRIORITY_LABELS[value],
}));

export const STATUS_OPTIONS = TICKET_STATUSES.map((value) => ({
  value,
  label: STATUS_LABELS[value],
}));
