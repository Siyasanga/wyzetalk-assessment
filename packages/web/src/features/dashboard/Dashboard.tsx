import { TICKET_CATEGORIES, type TicketStatsDto } from '@wyzetalk/db/types';
import { CATEGORY_LABELS } from '../../lib/labels';
import type { TicketQuery } from '../tickets/ticket.api';

type DashboardProps = {
  stats: TicketStatsDto | null;
  /** Clicking a tile narrows the list below it, so the number is explorable. */
  onDrillDown: (query: TicketQuery) => void;
};

/**
 * The four figures the brief asks for, from a single `/tickets/stats` call.
 *
 * "High priority" deliberately combines high and urgent — someone scanning for
 * what needs attention does not want to add two tiles together in their head.
 */
export function Dashboard({ stats, onDrillDown }: DashboardProps) {
  if (!stats) {
    return (
      <section className="card" aria-busy="true">
        <h2>Dashboard</h2>
        <p className="muted">Loading figures…</p>
      </section>
    );
  }

  const highPriority = stats.byPriority.high + stats.byPriority.urgent;
  const categoriesWithCounts = TICKET_CATEGORIES.filter((category) => stats.byCategory[category] > 0);

  return (
    <section className="card">
      <h2>Dashboard</h2>

      <div className="tiles">
        <button type="button" className="tile" onClick={() => onDrillDown({ status: 'open' })}>
          <span className="tile-value">{stats.byStatus.open}</span>
          <span className="tile-label">Open</span>
        </button>

        <button
          type="button"
          className="tile"
          onClick={() => onDrillDown({ status: 'in_progress' })}
        >
          <span className="tile-value">{stats.byStatus.in_progress}</span>
          <span className="tile-label">In progress</span>
        </button>

        <button type="button" className="tile" onClick={() => onDrillDown({ priority: 'high' })}>
          <span className="tile-value">{highPriority}</span>
          <span className="tile-label">High priority</span>
        </button>

        <button
          type="button"
          className={stats.overdue > 0 ? 'tile tile-alert' : 'tile'}
          onClick={() => onDrillDown({ overdue: true })}
        >
          <span className="tile-value">{stats.overdue}</span>
          <span className="tile-label">Overdue</span>
        </button>
      </div>

      <h3 className="subheading">By category</h3>
      {categoriesWithCounts.length === 0 ? (
        <p className="muted">No requests yet.</p>
      ) : (
        <ul className="category-bars">
          {categoriesWithCounts.map((category) => {
            const count = stats.byCategory[category];
            const share = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0;

            return (
              <li key={category}>
                <button type="button" className="category-row" onClick={() => onDrillDown({ category })}>
                  <span className="category-name">{CATEGORY_LABELS[category]}</span>
                  <span className="category-bar" aria-hidden="true">
                    <span className="category-fill" style={{ width: `${share}%` }} />
                  </span>
                  <span className="category-count">{count}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
