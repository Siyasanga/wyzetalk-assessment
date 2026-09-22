import type { TicketCategory, TicketPriority, TicketStatus } from '@wyzetalk/db/types';
import { CATEGORY_OPTIONS, PRIORITY_OPTIONS, STATUS_OPTIONS } from '../../lib/labels';
import type { TicketQuery } from './ticket.api';

type TicketFiltersProps = {
  query: TicketQuery;
  onChange: (next: TicketQuery) => void;
};

export function TicketFilters({ query, onChange }: TicketFiltersProps) {
  function patch(changes: Partial<TicketQuery>): void {
    onChange({ ...query, ...changes });
  }

  const isFiltered =
    Boolean(query.q) ||
    Boolean(query.status) ||
    Boolean(query.priority) ||
    Boolean(query.category) ||
    Boolean(query.overdue);

  return (
    <section className="card filters">
      <div className="card-heading">
        <h2>Search and filter</h2>
        {isFiltered ? (
          <button type="button" className="link" onClick={() => onChange({})}>
            Clear all
          </button>
        ) : null}
      </div>

      <label className="field">
        <span>Search</span>
        <input
          type="search"
          name="q"
          value={query.q ?? ''}
          placeholder="Title or description"
          onChange={(event) => patch({ q: event.target.value })}
        />
      </label>

      <div className="filter-row">
        <label className="field">
          <span>Status</span>
          <select
            name="status"
            value={query.status ?? ''}
            onChange={(event) => patch({ status: event.target.value as TicketStatus | '' })}
          >
            <option value="">Any</option>
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>Priority</span>
          <select
            name="priority"
            value={query.priority ?? ''}
            onChange={(event) => patch({ priority: event.target.value as TicketPriority | '' })}
          >
            <option value="">Any</option>
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
            value={query.category ?? ''}
            onChange={(event) => patch({ category: event.target.value as TicketCategory | '' })}
          >
            <option value="">Any</option>
            {CATEGORY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="checkbox">
        <input
          type="checkbox"
          name="overdue"
          checked={query.overdue ?? false}
          onChange={(event) => patch({ overdue: event.target.checked })}
        />
        <span>Overdue only</span>
      </label>
    </section>
  );
}
