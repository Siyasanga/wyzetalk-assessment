import type { TicketDto, TicketStatsDto } from '@wyzetalk/db/types';
import { useCallback, useEffect, useState } from 'react';
import { errorMessage } from '../../lib/api-error';
import type { TicketApi, TicketQuery } from './ticket.api';

export type UseTickets = {
  tickets: TicketDto[];
  total: number;
  stats: TicketStatsDto | null;
  query: TicketQuery;
  isLoading: boolean;
  error: string | null;
  setQuery: (next: TicketQuery) => void;
  refresh: () => void;
};

const EMPTY_QUERY: TicketQuery = {};

/**
 * Owns the list and the dashboard counts together.
 *
 * They are loaded in one pass on purpose: changing a request's status changes
 * both, and refreshing them separately is how a dashboard ends up disagreeing
 * with the list underneath it.
 */
export function useTickets(api: TicketApi): UseTickets {
  const [query, setQuery] = useState<TicketQuery>(EMPTY_QUERY);
  const [tickets, setTickets] = useState<TicketDto[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<TicketStatsDto | null>(null);
  const [isLoading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const refresh = useCallback(() => setReloadToken((value) => value + 1), []);

  useEffect(() => {
    // A stale response from a superseded filter must not overwrite a newer one.
    let active = true;

    setLoading(true);
    setError(null);

    Promise.all([api.list(query), api.stats()])
      .then(([page, nextStats]) => {
        if (!active) return;
        setTickets(page.items);
        setTotal(page.total);
        setStats(nextStats);
      })
      .catch((cause: unknown) => {
        if (!active) return;
        setError(errorMessage(cause));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [api, query, reloadToken]);

  return { tickets, total, stats, query, isLoading, error, setQuery, refresh };
}
