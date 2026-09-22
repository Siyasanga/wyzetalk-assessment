# Service Request Dashboard

An internal help desk for employees to log and manage support requests — "My laptop isn't connecting to WiFi."

## Quick start

**Prerequisites:** Node 20+, pnpm 10+, and MongoDB running locally on `27017` (`docker run -d -p 27017:27017 mongo:7` works).

```bash
pnpm install
cp packages/api/.env.example packages/api/.env   # set JWT_SECRET to 32+ characters
pnpm seed                                        # demo users + 4 requests
pnpm dev                                         # API on :4000, web on :5173
```

Then open http://localhost:5173 and sign in:

| Account | Password | Sees |
| --- | --- | --- |
| `thabo@wyzetalk.test` | `Requester123!` | Only their own requests |
| `agent@wyzetalk.test` | `Agent123!` | Every request, can assign and change status |
| `admin@wyzetalk.test` | `Admin123!` | Everything, plus user management |

## The screens

Four views, switched from the tab bar:

- **Dashboard** — open, in progress, high priority (high + urgent combined) and overdue, plus a breakdown by category. Every figure is clickable: it applies the matching filter and drops you on the request list.
- **Requests** — the list, with free-text search and filters for status, priority, category and overdue-only. Each row can be moved through its lifecycle in place.
- **New request** — the create form, validated in the browser against the same Zod schema the API uses.
- **Request detail** — the full record, the moves available from its current status, and an edit form for title, description, priority and category.

Status buttons are generated from `TICKET_STATUS_TRANSITIONS`, the same table the API validates against, so the UI can only ever offer a move the server will accept.

## How the data is stored

MongoDB, through Mongoose, in two collections: `users` and `tickets`. The connection string is `MONGODB_URI`; the seed script drops and recreates the requests each run, so it is safe to re-run.

The important structural decision is that **nothing outside `packages/db` imports Mongoose**. Repositories take and return plain domain objects, so the service layer has no idea what the storage engine is:

```
packages/db     domain rules + Mongoose models + repositories
packages/api    services + HTTP (Express) — depends on repository types, never on Mongoose
packages/web    React + Vite — imports @wyzetalk/db/types only (no Mongoose in the bundle)
```

`packages/db` has two entry points for exactly this reason. `@wyzetalk/db/types` holds the domain entities, the Zod request contracts and the repository interfaces, with `zod` as its only dependency, so the browser can share the validation schemas with the server. `@wyzetalk/db` holds the connection, the models and the Mongo repository implementations, and is server-only.

Two derived fields are maintained on write rather than computed on read:

- **`priorityRank` / `statusRank`** — sorting by priority alphabetically is meaningless (`"high" < "low"`), so each write stores a numeric rank and Mongo sorts on that.
- **`dueAt`** — set once at creation from the request's priority.

## Running the tests

```bash
pnpm -r test        # 35 tests
pnpm -r typecheck
```

The suites are split by what they prove:

- **`packages/db` (16)** — the pure rules: the status machine, the overdue calculation, the access policies. No database, no HTTP.
- **`packages/api` (15)** — the service layer against in-memory repository fakes, plus HTTP plumbing (auth, error envelope, validation) via supertest. No database.
- **`packages/web` (4)** — the create-request form, including client-side validation and the API error path.

Nothing in the test suite needs Mongo running, which keeps it fast and deterministic.

## The request lifecycle

Statuses move through a table, not a pile of `if`s:

```
open ⇄ in_progress → resolved → closed
               ↑__________|         |
                closed reopens only to open
```

An illegal move returns **409 Conflict**, not a validation error — the payload was fine, it conflicted with the request's current state. The rule lives in one pure function, `applyStatusChange`, which also keeps `resolvedAt` / `closedAt` consistent; the repository just writes what it returns.

## Validation and errors

Every response failure uses one envelope:

```json
{ "error": { "code": "VALIDATION_FAILED", "message": "…", "details": { "title": ["Title is too short."] } } }
```

Requests are parsed with Zod schemas that live in `@wyzetalk/db/types` and are shared with the React app, so the client and the server cannot drift. A validation failure returns 422 with per-field messages; the front end renders them inline against the right input.

## API

All routes are under `/api/v1` and need a bearer token except `/health`, `/auth/register` and `/auth/login`.

| Method | Path | Notes |
| --- | --- | --- |
| `GET` | `/tickets` | Filters: `status`, `priority`, `category`, `assigneeId`, `overdue=true`, `q`; sorting and pagination |
| `GET` | `/tickets/stats` | The dashboard, in one call |
| `POST` | `/tickets` | Create |
| `GET` | `/tickets/:id` | Single request |
| `PATCH` | `/tickets/:id` | Title, description, priority, category |
| `PATCH` | `/tickets/:id/status` | A transition, not a field write |
| `PATCH` | `/tickets/:id/assignee` | Staff only; `null` unassigns |
| `DELETE` | `/tickets/:id` | Admin only |

## Assumptions

- **Authentication was not asked for.** The brief lists a Requester field but no login. I added email/password auth with a single JWT and three roles (requester / agent / admin) because "requester" is meaningless unless the server knows who is asking, and because it makes the visibility rules demonstrable. It is more than the brief needed.
- **"Overdue" is a response-time target, not a contractual SLA.** `dueAt` is derived from priority at creation — urgent 4h, high 24h, medium 72h, low 168h — and a request counts as overdue only while it is still active. A resolved or closed request is never overdue, however late it was.
- **Category is a fixed list**, not free text: hardware, software, network, access, facilities, other. The dashboard groups by it, and free text would need cleaning before it could be grouped.
- **A requester sees only their own requests**, and another requester's request returns 404 rather than 403 — a 403 would confirm it exists.
- **Requesters may close and reopen their own requests.** Assignment is staff-only, deletion is admin-only and is a hard delete with no audit trail.
- **Attachments, comments and email notification are out of scope.**

## What I would do next

- An activity log per request — the brief does not ask for it, but a help desk without one is hard to support
- Integration tests against a real Mongo instance, to cover the repository layer that the unit tests deliberately fake
- Refresh tokens; the current access token is valid for 24 hours with no revocation
