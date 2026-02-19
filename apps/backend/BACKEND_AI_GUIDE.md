# Backend Skeleton Guide (Fastify + TypeScript + Modular / Feature‑first)

This document explains the backend skeleton that was generated for this project.  
Its purpose is to help **AI assistants and developers** understand *where code should go* and *why each folder/file exists*.

---

## Why this structure exists

- **Feature-first clarity**: you can immediately see key features (`auth`, `teams`, `submissions`, `admin`, `events`).
- **Scales cleanly**: adding new features does not clutter global `controllers/` or `models/` directories.
- **Consistent collaboration**: AI can generate code faster and safer when there is a predictable pattern.
- **Clear responsibilities**: routes/controller/service/repo/schema are separated to reduce coupling.

---

## Folder Structure Overview

```
src/
  app.ts
  server.ts

  config/
    env.ts
    db.ts

  middleware/
    authRequired.ts
    isAdmin.ts
    errorHandler.ts

  shared/
    response.ts
    errors.ts
    logger.ts
    constants.ts
    utils.ts

  modules/
    health/
      health.routes.ts

    auth/
      auth.routes.ts
      auth.controller.ts
      auth.service.ts
      auth.repo.ts
      auth.schema.ts
      auth.types.ts

    events/
      events.routes.ts
      events.controller.ts
      events.service.ts
      events.repo.ts
      events.schema.ts
      events.types.ts

    teams/
      teams.routes.ts
      teams.controller.ts
      teams.service.ts
      teams.repo.ts
      teams.schema.ts
      teams.types.ts

    submissions/
      submissions.routes.ts
      submissions.controller.ts
      submissions.service.ts
      submissions.repo.ts
      submissions.schema.ts
      submissions.types.ts

    admin/
      admin.routes.ts
      admin.controller.ts
      admin.service.ts
      admin.repo.ts
      admin.schema.ts
      admin.types.ts

  db/
    migrations/
      001_init.sql
      002_seed.sql
```

---

## Core entry points

### `src/server.ts`
**Bootstraps the runtime**:
- Loads environment variables (`.env`) via `config/env.ts`
- Creates a DB pool (if enabled) via `config/db.ts`
- Builds the Fastify app via `buildApp(...)`
- Starts listening on a port (`app.listen(...)`)

**Rule of thumb**: `server.ts` should not contain business logic—only wiring/boot logic.

### `src/app.ts`
**Composes the Fastify application**:
- Creates the Fastify instance
- Registers global plugins (CORS, sensible, JWT, etc.)
- Registers module routes with prefixes (e.g., `/api/auth`, `/api/teams`)
- Defines a global error handler

**Rule of thumb**: `app.ts` is where you *register* modules, not where you *implement* feature logic.

---

## Config

### `src/config/env.ts`
- Loads environment variables
- Validates them (recommended: Zod schema)
- Ensures missing/invalid env fails **at startup**, not mid-request

### `src/config/db.ts`
- Creates a MySQL/MariaDB connection pool (`mysql2/promise`)
- Provides helpers:
  - `pingDB()` for connectivity checks
  - query helpers / transaction helpers (optional, add later)

---

## Middleware (`src/middleware/`)
Cross-cutting request logic reused across multiple modules:

- `authRequired.ts`  
  Validates authentication (JWT/session), attaches user context to the request.

- `isAdmin.ts`  
  Authorization guard for admin-only routes.

- `errorHandler.ts`  
  Centralized error translation to consistent API responses (optional if handled in `app.ts`).

---

## Shared (`src/shared/`)
Shared helpers used across modules to avoid duplication:

- `response.ts`  
  Standard API response helpers (e.g., `{ ok, data, message }`).

- `errors.ts`  
  Custom error classes / error codes (e.g., `BadRequestError`, `UnauthorizedError`).

- `logger.ts`  
  Logging wrapper or shared logger config.

- `constants.ts`  
  Project-wide constants (role names, limits, regex patterns).

- `utils.ts`  
  Generic utilities (random code generator, date helpers, etc.).

---

## Modules (`src/modules/<feature>/`)
Each module is a **self-contained feature**.  
Inside a module, files follow a consistent layered pattern:

### `*.routes.ts`
- Defines endpoints and HTTP methods
- Applies middleware (auth, admin guards)
- Calls controller functions

### `*.controller.ts`
- Handles request/response mapping only
- Parses params/body (already validated by schema)
- Calls service layer
- Does **not** talk to DB directly

### `*.service.ts`
- Business rules / workflows
- Example: “team code must be unique”, “submission only allowed while event is open”
- Calls repo layer

### `*.repo.ts`
- DB-only logic (SQL queries, transactions)
- Should not contain business rules

### `*.schema.ts`
- Request validation schemas (recommended: Zod)
- Validates params/body/query for each endpoint

### `*.types.ts` (optional)
- Types/interfaces that are specific to the module
- Keeps shared types out of global scope unless necessary

---

## Suggested module responsibilities (Hackathon)

### `auth/`
- Register / login / logout / me
- Token/session issuance and verification
- Role and permissions hooks

### `events/` (Edition / Year)
- Event edition configuration (year, open/close dates)
- Current active event lookup
- Enables multi-year operation

### `teams/`
- Create team, join team via code
- Regenerate random team code (like game lobby)
- Team members management

### `submissions/`
- Submit project/work, upload links, files metadata
- Validate submission window and team ownership

### `admin/`
- Approve/reject teams
- Manage event settings (open registration/submission, etc.)
- View exports/report summaries (optional)

### `health/`
- Basic service and DB connectivity checks

---

## Coding rules (important)

1. **Routes → Controller → Service → Repo**
2. Controllers **must not** query the DB.
3. Repos **must not** contain business rules.
4. Validation should be done in `schema.ts` (or Fastify schema hooks).
5. Keep module boundaries clear; prefer calling another module via service interfaces rather than importing internals directly.

---

## Where to add new features

- Add a new folder: `src/modules/<newFeature>/`
- Add the standard files: `routes/controller/service/repo/schema/types`
- Register the module in `src/app.ts` with a prefix:
  - `app.register(newFeatureRoutes, { prefix: '/api/new-feature' })`

---

## Environment variables

Use:
- `.env.example` for documentation
- `.env` locally for real secrets (**never commit**)

Typical DB variables:
- `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`

---

## Notes for AI assistants

When generating code:
- Follow the existing folder naming and file naming conventions.
- Keep code minimal and consistent with the layering rules above.
- Prefer small, composable functions; avoid “god services”.
