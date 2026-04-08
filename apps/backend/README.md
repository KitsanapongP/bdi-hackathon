# Hackathon Backend (Fastify + TypeScript)

This backend is organized using a **modular / feature-first** structure (modules like `auth`, `teams`, `submissions`, `admin`, `events`).

---

## Requirements
- Node.js 18+ (recommended 20+)
- MySQL/MariaDB (only if you enable DB features)

---

## Install
```bash
npm install
```

---

## Environment variables
Create `.env` from the example:
```bash
cp .env.example .env
```

Windows PowerShell:
```powershell
copy .env.example .env
```

Edit `.env` values as needed (e.g. `PORT`, `DB_*`).

> Never commit `.env` (it contains secrets).

---

## Run (development)
```bash
npm run dev
```

Check:
- `GET http://localhost:<PORT>/`  → should return `{ ok: true, ... }`
- `GET http://localhost:<PORT>/api/health` → should return `{ ok: true }`

If DB health is enabled:
- `GET http://localhost:<PORT>/api/health/db`

---

## Build & Run (production-like)
```bash
npm run build
npm run start
```

---

## Email retry queue (for SMTP quota limits)
When SMTP returns quota/rate-limit errors, email logs are stored with `status = queued` and `retry_after_at`.

Run retry worker manually:
```bash
npm run retry:emails
```

Recommended scheduler setup: run this command every 1 hour.

Optional env values:
- `SMTP_QUOTA_RETRY_DELAY_MS` (default `3600000`)
- `SMTP_RETRY_BATCH_SIZE` (default `200`)

---

## Migrations (manual SQL scripts)
Migration SQL files are stored here:
- `src/db/migrations/`

Typical usage:
- `001_init.sql` = initial schema (tables, constraints)
- `002_seed.sql` = initial data (roles, admin user, default event, etc.)
- later changes should be new files like `003_add_xxx.sql` (avoid editing old migrations after others have used them)

Run migrations using your preferred tool:
- DBeaver / phpMyAdmin / MySQL client (open the file and execute)
- CLI example:
  ```bash
  mysql -h <HOST> -P <PORT> -u <USER> -p <DB_NAME> < src/db/migrations/001_init.sql
  ```

---

## Project structure (high level)
- `src/server.ts` = bootstrap (load env, connect db, listen)
- `src/app.ts` = compose Fastify app, register modules
- `src/modules/*` = feature modules (routes/controller/service/repo/schema)
- `src/shared/*` = shared helpers across modules
- `src/middleware/*` = auth/role guards and common middleware
- `src/config/*` = env/db configuration
