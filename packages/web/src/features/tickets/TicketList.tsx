import {
  TICKET_STATUS_TRANSITIONS,
  type TicketDto,
  type TicketStatus,
} from '@wyzetalk/db/types';
import { useState } from 'react';
import { errorMessage } from '../../lib/api-error';
import { CATEGORY_LABELS, PRIORITY_LABELS, STATUS_LABELS } from '../../lib/labels';
import type { TicketApi } from './ticket.api';

type TicketListProps = {
  tickets: TicketDto[];
  total: number;
  isLoading: boolean;
  api: Pick<TicketApi, 'changeStatus'>;
  onChanged: () => void;
  /** Opens the detail screen for one request. */
  onSelect: (ticket: TicketDto) => void;
};

export function TicketList({ tickets, total, isLoading, api, onChanged, onSelect }: TicketListProps) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function moveTo(ticket: TicketDto, status: TicketStatus): Promise<void> {
    setBusyId(ticket.id);
    setError(null);

    try {
      await api.changeStatus(ticket.id, status);
      onChanged();
    } catch (cause) {
      // A 409 means someone else moved it first — the message says so.
      setError(errorMessage(cause));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="card">
      <div className="card-heading">
        <h2>Requests</h2>
        <span className="muted">
          {isLoading ? 'Loading…' : `${total} ${total === 1 ? 'request' : 'requests'}`}
        </span>
      </div>

      {error ? (
        <p className="banner banner-error" role="alert">
          {error}
        </p>
      ) : null}

      {tickets.length === 0 && !isLoading ? (
        <p className="muted">No requests match these filters.</p>
      ) : (
        <ul className="ticket-list">
          {tickets.map((ticket) => (
            <li key={ticket.id} className="ticket-row">
              <div className="ticket-head">
                <button type="button" className="ticket-title" onClick={() => onSelect(ticket)}>
                  {ticket.title}
                </button>
                {ticket.isOverdue ? <span className="pill pill-danger">Overdue</span> : null}
              </div>

              <p className="ticket-description">{ticket.description}</p>

              <div className="ticket-meta">
                <span className={`pill pill-status-${ticket.status}`}>
                  {STATUS_LABELS[ticket.status]}
                </span>
                <span className={`pill pill-priority-${ticket.priority}`}>
                  {PRIORITY_LABELS[ticket.priority]}
                </span>
                <span className="pill">{CATEGORY_LABELS[ticket.category]}</span>
                <span className="muted">
                  {ticket.requester?.name ?? 'Unknown'} ·{' '}
                  {new Date(ticket.createdAt).toLocaleDateString()}
                  {ticket.assignee ? ` · assigned to ${ticket.assignee.name}` : ' · unassigned'}
                </span>
              </div>

              {/*
                The buttons come from the same transition table the API validates
                against, so the UI can only ever offer a move the server accepts.
              */}
              <div className="ticket-actions">
                {TICKET_STATUS_TRANSITIONS[ticket.status].map((next) => (
                  <button
                    key={next}
                    type="button"
                    className="link"
                    disabled={busyId === ticket.id}
                    onClick={() => void moveTo(ticket, next)}
                  >
                    Mark {STATUS_LABELS[next].toLowerCase()}
                  </button>
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
