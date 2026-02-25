# Deploy Guide (Plesk) — bdi-hackathon

This guide explains how to deploy the **bdi-hackathon** monorepo on **Plesk** using **Git pull/deploy**.

Repo structure (important):

```
bdi-hackathon/
  apps/
    frontend/   # Vite + React (static build -> dist/)
    backend/    # TypeScript + Fastify (Node.js runtime)
```

---

## Recommended setup (no real domains)

Use **separate hostnames** for:
- **Frontend (static site)** — e.g. `FRONTEND_HOST`
- **Backend API (Node.js)** — e.g. `API_HOST`

> Keep hostnames private in test environments. In this document we use placeholders:
> - `FRONTEND_HOST` = your frontend hostname (HTTPS)
> - `API_HOST` = your backend API hostname (HTTPS)

---

## Prerequisites

- Plesk access to both hostnames/subdomains
- Git repository connected in Plesk (per-hostname)
- Node.js enabled on Plesk (for backend; frontend only needs Node.js if you build on the server)
- MySQL database created on the same Plesk server (recommended)

---

## One-time setup

### 1) Create the API hostname/subdomain

In Plesk, create your API hostname/subdomain (the one you will use as `API_HOST`) and enable SSL (Let’s Encrypt) for it.

---

### 2) Connect the Git repository in Plesk (both frontend + backend)

Do this once for each hostname:
- Frontend site (`FRONTEND_HOST`)
- Backend API site (`API_HOST`)

Plesk → **Git** → connect to your remote repo.

> Tip: Use the same repo for both sites (monorepo). Each site builds/serves a different app folder.

---

## Frontend (Vite/React) — static site

### A) Required files in the repo

1) **Production env** for Vite (commit this):
- `apps/frontend/.env.production`

Example:

```
VITE_API_BASE_URL=https://API_HOST
```

2) **SPA refresh fallback** for React Router (commit this):
- `apps/frontend/public/.htaccess`

Example:

```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /

  RewriteCond %{REQUEST_FILENAME} -f [OR]
  RewriteCond %{REQUEST_FILENAME} -d
  RewriteRule ^ - [L]

  RewriteRule ^ index.html [L]
</IfModule>
```

> Vite will copy everything in `public/` to the root of `dist/` during build, so after build you should see `apps/frontend/dist/.htaccess`.

---

### B) One-time: set Document Root to `dist`

Plesk → Frontend site (`FRONTEND_HOST`) → **Hosting Settings**

- **Document root:** `apps/frontend/dist`

Save/Apply.

---

### C) After each Git pull/deploy: build the frontend

Run these commands in Plesk (Node.js UI, terminal, or Deploy actions):

```
cd apps/frontend
npm ci
npm run build
```

**Verify build output on the server:**

`apps/frontend/dist/` must contain:
- `index.html`
- `assets/…`
- `.htaccess`  (copied from `public/.htaccess`)

---

### D) Notes

- Frontend is **static**. You do **not** need to keep Node.js enabled on the frontend site after building.
- If you see old behavior, do a hard refresh:
  - Chrome DevTools → right-click refresh → **Empty Cache and Hard Reload**

---

## Backend (Fastify/TypeScript) — Node.js runtime

### A) One-time: configure Node.js app

Plesk → Backend API site (`API_HOST`) → **Node.js**

1) **Enable Node.js**
2) Set:
- **Application Root:** `apps/backend`
- **Document Root:** `apps/backend/public`
  - If it doesn’t exist, create an empty folder: `apps/backend/public/`
- **Application Startup File:** `dist/server.js`
  - Confirm after build that `apps/backend/dist/server.js` exists

---

### B) One-time: set backend Environment Variables (Plesk)

Plesk → Backend API site (`API_HOST`) → **Node.js** → **Custom environment variables**

Minimum required (based on `apps/backend/src/config/env.ts`):

```
NODE_ENV=production
DB_HOST=localhost
DB_PORT=3306
DB_USER=YOUR_DB_USER
DB_PASSWORD=YOUR_DB_PASSWORD
DB_NAME=YOUR_DB_NAME
JWT_SECRET=YOUR_RANDOM_LONG_SECRET
CORS_ORIGIN=https://FRONTEND_HOST
```

Optional local testing:

```
CORS_ORIGIN=https://FRONTEND_HOST,http://localhost:5173
```

**Important notes**
- Do **not** use example JWT secrets in production.
- In Plesk, `process.env.PORT` is managed by Plesk; your backend should listen using `process.env.PORT` (with a fallback for local).

---

### C) One-time: assign the database to the API website (Plesk)

Plesk → **Databases** → select your DB → **Assign this database to a website**:
- Assign to: your backend API site (`API_HOST`)

> Frontend must NOT connect to the database directly.

---

### D) After each Git pull/deploy: install + build + restart

Run in Plesk:

```
cd apps/backend
npm ci
npm run build
```

Then:
- Plesk → **Node.js** → **Restart App**

**Verify**
- Open your health endpoint on `API_HOST` (example: `https://API_HOST/health`)

---

## Suggested Deploy Actions (optional)

If your Plesk Git UI supports “Deploy actions”, you can automate builds.

### Frontend deploy actions

```
cd apps/frontend
npm ci
npm run build
```

### Backend deploy actions

```
cd apps/backend
npm ci
npm run build
```

Then restart Node.js app (some Plesk setups restart automatically; otherwise click **Restart App**).

---

## Troubleshooting

### 1) React Router route works only after visiting `/` first (F5 gives 404)
Cause: server is treating `/home` as a real path.  
Fix:
- Ensure `apps/frontend/public/.htaccess` exists in repo
- Rebuild frontend
- Confirm `apps/frontend/dist/.htaccess` exists on server
- Confirm Document root points to `apps/frontend/dist`

### 2) Frontend calls `/api/...` and gets 404
Cause: production Vite proxy does not exist.  
Fix:
- Use `.env.production` + `apiUrl()` helper
- Rebuild and redeploy `dist/`

### 3) Backend won’t start (Startup file missing)
Fix:
- Run `npm run build` in `apps/backend`
- Ensure `apps/backend/dist/server.js` exists
- Set Startup file to `dist/server.js`

### 4) Database connection failed
Fix:
- Use `DB_HOST=localhost` (same server)
- Verify DB user/password + privileges
- Confirm the DB is assigned to the API website

### 5) CORS errors in browser
Fix:
- Ensure backend CORS is configured for production allowlist
- Set `CORS_ORIGIN=https://FRONTEND_HOST` in Plesk for backend

---

## Security checklist

- ✅ Keep `JWT_SECRET` only in Plesk env (not in git)
- ✅ Keep DB password only in Plesk env (not in git)
- ✅ Use HTTPS for both frontend and API
- ✅ Restrict CORS in production (allow only your frontend origin)
