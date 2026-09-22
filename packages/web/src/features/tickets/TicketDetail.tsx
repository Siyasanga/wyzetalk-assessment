import {
  TICKET_STATUS_TRANSITIONS,
  type TicketDto,
  type TicketCategory,
  type TicketPriority,
  type TicketStatus,
  updateTicketSchema,
} from '@wyzetalk/db/types';
import { type FormEvent, useState } from 'react';
import { errorMessage, isApiError } from '../../lib/api-error';
import { type FieldErrors, firstError, toFieldErrors } from '../../lib/form';
import {
  CATEGORY_LABELS,
  CATEGORY_OPTIONS,
  PRIORITY_LABELS,
  PRIORITY_OPTIONS,
  STATUS_LABELS,
} from '../../lib/labels';
import type { TicketApi } from './ticket.api';

type TicketDetailProps = {
  ticket: TicketDto;
  api: Pick<TicketApi, 'update' | 'changeStatus'>;
  onChanged: (ticket: TicketDto) => void;
  onBack: () => void;
};

/** The update screen: edit the fields, or move the request through its lifecycle. */
export function TicketDetail({ ticket, api, onChanged, onBack }: TicketDetailProps) {
  const [form, setForm] = useState({
    title: ticket.title,
    description: ticket.description,
    priority: ticket.priority,
    category: ticket.category,
  });
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isBusy, setBusy] = useState(false);

  const isDirty =
    form.title !== ticket.title ||
    form.description !== ticket.description ||
    form.priority !== ticket.priority ||
    form.category !== ticket.category;

  async function handleSave(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError(null);
    setNotice(null);

    // Same schema the API validates with, so the two cannot drift.
    const parsed = updateTicketSchema.safeParse(form);

    if (!parsed.success) {
      setFieldErrors(toFieldErrors(parsed.error));
      return;
    }

    setFieldErrors({});
    setBusy(true);

    try {
      const updated = await api.update(ticket.id, parsed.data);
      onChanged(updated);
      setNotice('Saved.');
    } catch (cause) {
      if (isApiError(cause) && Object.keys(cause.fieldErrors).length > 0) {
        setFieldErrors(cause.fieldErrors);
      }
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  async function moveTo(status: TicketStatus): Promise<void> {
    setError(null);
    setNotice(null);
    setBusy(true);

    try {
      const updated = await api.changeStatus(ticket.id, status);
      onChanged(updated);
      setNotice(`Moved to ${STATUS_LABELS[status].toLowerCase()}.`);
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  const titleError = firstError(fieldErrors, 'title');
  const descriptionError = firstError(fieldErrors, 'description');

  return (
    <section className="card">
      <div className="card-heading">
        <h2>Request detail</h2>
        <button type="button" className="link" onClick={onBack}>
          ← Back to requests
        </button>
      </div>

      {error ? (
        <p className="banner banner-error" role="alert">
          {error}
        </p>
      ) : null}
      {notice ? (
        <p className="banner banner-ok" role="status">
          {notice}
        </p>
      ) : null}

      <div className="ticket-meta detail-meta">
        <span className={`pill pill-status-${ticket.status}`}>{STATUS_LABELS[ticket.status]}</span>
        <span className={`pill pill-priority-${ticket.priority}`}>
          {PRIORITY_LABELS[ticket.priority]}
        </span>
        <span className="pill">{CATEGORY_LABELS[ticket.category]}</span>
        {ticket.isOverdue ? <span className="pill pill-danger">Overdue</span> : null}
      </div>

      <dl className="detail-facts">
        <div>
          <dt>Requester</dt>
          <dd>{ticket.requester?.name ?? 'Unknown'}</dd>
        </div>
        <div>
          <dt>Assigned to</dt>
          <dd>{ticket.assignee?.name ?? 'Unassigned'}</dd>
        </div>
        <div>
          <dt>Created</dt>
          <dd>{new Date(ticket.createdAt).toLocaleString()}</dd>
        </div>
        <div>
          <dt>Due</dt>
          <dd>{new Date(ticket.dueAt).toLocaleString()}</dd>
        </div>
      </dl>

      <h3 className="subheading">Move this request</h3>
      <div className="ticket-actions">
        {TICKET_STATUS_TRANSITIONS[ticket.status].length === 0 ? (
          <span className="muted">No moves available from here.</span>
        ) : (
          TICKET_STATUS_TRANSITIONS[ticket.status].map((next) => (
            <button
              key={next}
              type="button"
              disabled={isBusy}
              onClick={() => void moveTo(next)}
            >
              Mark {STATUS_LABELS[next].toLowerCase()}
            </button>
          ))
        )}
      </div>

      <h3 className="subheading">Edit</h3>
      <form className="form" onSubmit={handleSave} noValidate>
        <label className="field">
          <span>Title</span>
          <input
            name="title"
            value={form.title}
            onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
          />
          {titleError ? (
            <span className="field-error" role="alert">
              {titleError}
            </span>
          ) : null}
        </label>

        <label className="field">
          <span>Description</span>
          <textarea
            name="description"
            rows={4}
            value={form.description}
            onChange={(event) =>
              setForm((current) => ({ ...current, description: event.target.value }))
            }
          />
          {descriptionError ? (
            <span className="field-error" role="alert">
              {descriptionError}
            </span>
          ) : null}
        </label>

        <div className="filter-row">
          <label className="field">
            <span>Priority</span>
            <select
              name="priority"
              value={form.priority}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  priority: event.target.value as TicketPriority,
                }))
              }
            >
              {PRIORITY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Category</span>
            <select
              name="category"
              value={form.category}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  category: event.target.value as TicketCategory,
                }))
              }
            >
              {CATEGORY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <button type="submit" disabled={isBusy || !isDirty}>
          {isBusy ? 'Saving…' : 'Save changes'}
        </button>
      </form>
    </section>
  );
}
