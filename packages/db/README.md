# @wyzetalk/db

The data layer. Two entry points, deliberately separated:

| Import | Contains | Safe in the browser |
| --- | --- | --- |
| `@wyzetalk/db/types` | Domain entities, lifecycle rules, authorization policies, Zod request contracts | yes — no Mongoose, only `zod` |
| `@wyzetalk/db` | Mongoose connection, schemas, models and the repository implementations | no — server only |

Rules of the layer:

- Repositories take and return **domain** objects (`Ticket`, `User`), never Mongoose documents.
  Nothing outside this package should ever import `mongoose`.
- The repository *interfaces* (`TicketRepository`, `UserRepository`) live in `types/ports`, so the
  service layer in `/server` depends on the contract, not on Mongo, and can be unit tested with a
  fake.
- Domain rules that hold regardless of storage — the ticket status machine, the access policies —
  live in `types/domain` and are covered by unit tests here.
