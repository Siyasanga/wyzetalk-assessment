import type {
  CreateTicketInput,
  PageDto,
  TicketCategory,
  TicketDto,
  TicketPriority,
  TicketStatsDto,
  TicketStatus,
  UpdateTicketInput,
} from '@wyzetalk/db/types';
import type { ApiClient } from '../../lib/api-client';
import { toQueryString } from '../../lib/query-string';

/** What the list view can narrow by. Mirrors `listTicketsQuerySchema` on the API. */
export type TicketQuery = {
  status?: TicketStatus | '';
  priority?: TicketPriority | '';
  category?: TicketCategory | '';
  overdue?: boolean;
  q?: string;
  page?: number;
  limit?: number;
};

export type TicketApi = {
  create: (input: CreateTicketInput) => Promise<TicketDto>;
  list: (query?: TicketQuery) => Promise<PageDto<TicketDto>>;
  stats: () => Promise<TicketStatsDto>;
  update: (id: string, input: UpdateTicketInput) => Promise<TicketDto>;
  changeStatus: (id: string, status: TicketStatus) => Promise<TicketDto>;
};

export function createTicketApi(client: ApiClient): TicketApi {
  return {
    create: (input) => client.request<TicketDto>('/tickets', { method: 'POST', body: input }),

    list: (query = {}) =>
      client.request<PageDto<TicketDto>>(
        `/tickets${toQueryString({
          status: query.status || undefined,
          priority: query.priority || undefined,
          category: query.category || undefined,
          // Only send `overdue` when it is on: `false` would still be a filter.
          overdue: query.overdue ? 'true' : undefined,
          q: query.q || undefined,
          page: query.page,
          limit: query.limit,
        })}`,
      ),

    stats: () => client.request<TicketStatsDto>('/tickets/stats'),

    update: (id, input) =>
      client.request<TicketDto>(`/tickets/${id}`, { method: 'PATCH', body: input }),

    changeStatus: (id, status) =>
      client.request<TicketDto>(`/tickets/${id}/status`, { method: 'PATCH', body: { status } }),
  };
}
