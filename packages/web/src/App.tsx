import type { TicketDto } from '@wyzetalk/db/types';
import { useMemo, useRef, useState } from 'react';
import { Dashboard } from './features/dashboard/Dashboard';
import { LoginForm } from './features/auth/LoginForm';
import { createAuthApi } from './features/auth/auth.api';
import { CreateTicketForm } from './features/tickets/CreateTicketForm';
import { TicketDetail } from './features/tickets/TicketDetail';
import { TicketFilters } from './features/tickets/TicketFilters';
import { TicketList } from './features/tickets/TicketList';
import { type TicketApi, type TicketQuery, createTicketApi } from './features/tickets/ticket.api';
import { useTickets } from './features/tickets/useTickets';
import { API_BASE_URL, createApiClient } from './lib/api-client';
import { type Session, clearSession, readSession, writeSession } from './lib/auth-storage';

/**
 * Screens, as a tagged union rather than a router.
 *
 * The app is four views deep, so a full routing library would be more
 * ceremony than it buys — but the shape here maps one-to-one onto routes if
 * deep linking is ever needed.
 */
type Screen =
  | { name: 'dashboard' }
  | { name: 'requests' }
  | { name: 'new' }
  | { name: 'detail'; ticket: TicketDto };

export function App() {
  const [session, setSession] = useState<Session | null>(() => readSession());

  // The client is built once; it reads the current token through this ref so a
  // sign-in or sign-out never leaves a stale Authorization header behind.
  const sessionRef = useRef<Session | null>(session);
  sessionRef.current = session;

  const client = useMemo(
    () =>
      createApiClient({
        baseUrl: API_BASE_URL,
        getToken: () => sessionRef.current?.token ?? null,
        onUnauthorized: () => {
          clearSession();
          setSession(null);
        },
      }),
    [],
  );

  const authApi = useMemo(() => createAuthApi(client), [client]);
  const ticketApi = useMemo(() => createTicketApi(client), [client]);

  if (!session) {
    return (
      <div className="page">
        <header className="page-header">
          <h1>Service Requests</h1>
        </header>
        <main className="layout layout-single">
          <LoginForm
            api={authApi}
            onAuthenticated={(next) => {
              writeSession(next);
              setSession(next);
            }}
          />
        </main>
      </div>
    );
  }

  return (
    <SignedIn
      api={ticketApi}
      session={session}
      onSignOut={() => {
        clearSession();
        setSession(null);
      }}
    />
  );
}

type SignedInProps = {
  api: TicketApi;
  session: Session;
  onSignOut: () => void;
};

function SignedIn({ api, session, onSignOut }: SignedInProps) {
  const [screen, setScreen] = useState<Screen>({ name: 'dashboard' });
  const { tickets, total, stats, query, isLoading, error, setQuery, refresh } = useTickets(api);

  /** A dashboard tile applies its filter and drops you on the list. */
  function drillDown(next: TicketQuery): void {
    setQuery(next);
    setScreen({ name: 'requests' });
  }

  const tabs: Array<{ id: Screen['name']; label: string }> = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'requests', label: 'Requests' },
    { id: 'new', label: 'New request' },
  ];

  return (
    <div className="page">
      <header className="page-header">
        <h1>Service Requests</h1>
        <div className="session">
          <span>
            {session.user.name} · {session.user.role}
          </span>
          <button type="button" className="link" onClick={onSignOut}>
            Sign out
          </button>
        </div>
      </header>

      <nav className="tabs" aria-label="Sections">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={screen.name === tab.id ? 'tab tab-active' : 'tab'}
            aria-current={screen.name === tab.id ? 'page' : undefined}
            onClick={() => setScreen({ name: tab.id } as Screen)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {error ? (
        <p className="banner banner-error" role="alert">
          {error}
        </p>
      ) : null}

      {screen.name === 'dashboard' ? (
        <main className="layout layout-single-wide">
          <Dashboard stats={stats} onDrillDown={drillDown} />
        </main>
      ) : null}

      {screen.name === 'requests' ? (
        <main className="layout">
          <TicketList
            tickets={tickets}
            total={total}
            isLoading={isLoading}
            api={api}
            onChanged={refresh}
            onSelect={(ticket) => setScreen({ name: 'detail', ticket })}
          />
          <TicketFilters query={query} onChange={setQuery} />
        </main>
      ) : null}

      {screen.name === 'new' ? (
        <main className="layout layout-single">
          <CreateTicketForm
            api={api}
            onCreated={(ticket) => {
              refresh();
              setScreen({ name: 'detail', ticket });
            }}
          />
        </main>
      ) : null}

      {screen.name === 'detail' ? (
        <main className="layout layout-single-wide">
          <TicketDetail
            ticket={screen.ticket}
            api={api}
            onChanged={(updated) => {
              // Keep the open screen in step with what the API just returned.
              setScreen({ name: 'detail', ticket: updated });
              refresh();
            }}
            onBack={() => setScreen({ name: 'requests' })}
          />
        </main>
      ) : null}
    </div>
  );
}
