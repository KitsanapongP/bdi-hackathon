# Hackathon Admin Panel — Static Website Management + Team Request Handling
> **Note:** You do not need to follow this 100%. If you have a better approach, you can propose improvements and extend the design.  
> This document is written to be read by an AI coding agent. It is prescriptive: **implement everything described**.

## Goal
Build a new **Admin web area** that becomes accessible **immediately after login** when the user is allowed by the database table `access_allowlist`.  
Inside the Admin area, split features into **two systems**:

1) **Static Website Management** (content that appears on the public site)
2) **Team Request Management** (verification requests, rejections, fixes, approvals)

---

## 1) Admin Access & Routing (Mandatory)

### 1.1 Access rule (single source of truth)
After successful login, the system must check whether the logged-in user can access the Admin area.

**Rule:**  
A user is an admin if `access_allowlist` contains a row that matches the user and the admin area access policy (see DB queries below).  
If allowed → redirect to `/admin` (Admin Dashboard).  
If not allowed → redirect to normal member area (or `/`).

> The check must occur at **login completion** (backend) and also be **enforced on every admin API call** (backend middleware).

### 1.2 Recommended allowlist schema expectations
This project already has a `table_access_allowlist` table. Implement the logic as follows (adapt field names if your schema differs):

**Expected core columns (minimum):**
- `allowlist_id` (PK)
- `principal_type` (e.g., `'user'`)
- `principal_id` (the logged-in user id)
- `resource` (string)
- `action` (string)
- `is_active` (boolean / tinyint)
- `starts_at` (nullable datetime)
- `ends_at` (nullable datetime)
- `created_at`, `updated_at`

**Admin access is granted if:**
- `principal_type = 'user'`
- `principal_id = <current_user_id>`
- `resource = 'admin'`
- `action = 'access'`
- `is_active = 1`
- Current time is within `starts_at/ends_at` if present

### 1.3 Backend: Admin access check endpoint
Implement an endpoint that returns whether the current user is admin.

- `GET /api/admin/me/access`
- Requires authentication
- Returns:
  ```json
  { "isAdmin": true }
  ```

**SQL example:**
```sql
SELECT 1
FROM table_access_allowlist
WHERE principal_type = 'user'
  AND principal_id = ?
  AND resource = 'admin'
  AND action = 'access'
  AND is_active = 1
  AND (starts_at IS NULL OR starts_at <= NOW())
  AND (ends_at IS NULL OR ends_at >= NOW())
LIMIT 1;
```

### 1.4 Backend: Admin middleware
All Admin endpoints must be protected by:
1) `auth_required`
2) `admin_required` (new)

`admin_required` must:
- read `user_id` from auth context
- query allowlist (same logic as above, ideally cached per request)
- return 403 if not allowed

### 1.5 Frontend: Login redirect behavior
After login succeeds:
1) Frontend calls `GET /api/admin/me/access`
2) If `isAdmin=true` → navigate to `/admin`
3) Else → navigate to member landing page

Also:
- Admin routes (`/admin/*`) must have a route guard:
  - call `GET /api/admin/me/access`
  - if false → redirect away (e.g., `/`)

---

## 2) Admin UI Shell (Mandatory)

### 2.1 Routes
Create new admin pages (minimum):
- `/admin` — Admin Dashboard (entry)
- `/admin/static` — Static Website Management
- `/admin/requests` — Team Request Management
- `/admin/requests/:teamId` — Team request detail (review screen)

### 2.2 Layout
Admin layout must be distinct from public/member UI:
- Left sidebar nav
  - Dashboard
  - Static Website
  - Team Requests
- Top bar
  - Current user info
  - Logout button
- Content area

### 2.3 Permissions
If user loses allowlist access, any admin page must become inaccessible immediately (403 → redirect).

---

## 3) System A: Static Website Management (Mandatory)

### 3.1 What “static website” includes
These are the editable public site sections (you decided to store all except forums/news):
- Sponsors (logos/images, ordering, links)
- Rewards (table-like list)
- About (long-form content)
- Contacts (contact list / channels)
- Winners (after event; can be prepared early and published later)

### 3.2 Data model (admin-managed content)
Implement CRUD for each of these content types.  
If tables already exist, map to them. If not, create tables with these minimum fields:

#### 3.2.1 sponsors
- `sponsor_id` PK
- `name` (string)
- `logo_file_id` (FK to uploaded file)
- `website_url` (string, nullable)
- `sort_order` (int)
- `is_active` (bool)
- `created_at`, `updated_at`

#### 3.2.2 rewards
- `reward_id` PK
- `title` (string)
- `description` (text)
- `amount` (decimal or string if non-numeric)
- `rank_order` (int)
- `is_active` (bool)
- `created_at`, `updated_at`

#### 3.2.3 abouts
- `about_id` PK
- `title` (string)
- `content_html` (longtext) **store as HTML**
- `is_active` (bool)
- `updated_at`

#### 3.2.4 contacts
- `contact_id` PK
- `label` (string) e.g., “Email”, “Facebook”
- `value` (string) e.g., email/URL/phone
- `sort_order` (int)
- `is_active` (bool)
- `updated_at`

#### 3.2.5 winners
- `winner_id` PK
- `team_id` (FK)
- `prize_label` (string) e.g., “1st Place”
- `project_title` (string)
- `project_summary` (text)
- `sort_order` (int)
- `is_published` (bool)
- `updated_at`

### 3.3 File uploads for static content
Sponsors require image upload. Implement a generic upload subsystem:
- `POST /api/files` (multipart)
- Save file metadata in `files` table:
  - `file_id`, `original_name`, `stored_name`, `mime_type`, `size_bytes`, `storage_path`, `created_at`
- Store file in server storage (local folder or object storage)
- Provide read endpoint:
  - `GET /api/files/:fileId` (stream)
- Sponsors reference `logo_file_id`

### 3.4 Admin APIs (static system)
Create Admin endpoints under `/api/admin/static/*`:
- Sponsors:
  - `GET /api/admin/static/sponsors`
  - `POST /api/admin/static/sponsors`
  - `PUT /api/admin/static/sponsors/:id`
  - `DELETE /api/admin/static/sponsors/:id` (soft delete or is_active=0)
- Rewards:
  - `GET/POST/PUT/DELETE` similarly
- About:
  - `GET /api/admin/static/about`
  - `PUT /api/admin/static/about/:id` or single record update
- Contacts:
  - `GET/POST/PUT/DELETE`
- Winners:
  - `GET/POST/PUT/DELETE`
  - plus publish toggle:
    - `POST /api/admin/static/winners/:id/publish`
    - `POST /api/admin/static/winners/:id/unpublish`

All these endpoints must pass `admin_required`.

### 3.5 Admin UI (static system)
Build pages with forms and tables:
- Sponsors:
  - list table with logo preview, name, URL, order, active
  - create/edit modal
  - reorder by sort_order
- Rewards:
  - table editor
- About:
  - HTML editor (basic WYSIWYG or textarea storing HTML)
- Contacts:
  - list + ordering
- Winners:
  - list + publish toggle + link to team details

### 3.6 Public site consumption
Public pages must read **public** endpoints (no admin auth):
- `GET /api/public/static/sponsors`
- `GET /api/public/static/rewards`
- `GET /api/public/static/about`
- `GET /api/public/static/contacts`
- `GET /api/public/static/winners` (only published)

Public endpoints must:
- filter `is_active=1`
- sort by `sort_order` or `rank_order`
- for winners: `is_published=1`

---

## 4) System B: Team Request Management (Mandatory)
This system manages “team submissions” and “verification review cycles” where reviewers can:
- approve
- reject with reasons
- require fixes from specific members
- prevent team leader from re-submitting until fixes are satisfied

### 4.1 Key behavioral requirements
1) **Leader can submit** a team request only if:
   - all team members have completed required profile fields
   - team has at least 1 uploaded file (initial submission)
   - team is not currently blocked by pending fixes
2) If a submission is **rejected**:
   - the system creates fix tasks (“Fix items”) for specific members
   - the leader **cannot submit again** until all fix items are resolved
3) Since uploads are “untyped” (no per-document slots):
   - a fix item is resolved when the member uploads **at least one new file after the rejection timestamp**
4) No need to delete old files; keep them for audit.
   - Optionally mark old files as `rejected` for UI clarity.

### 4.2 Data model (minimum)
If your DB already has verification tables, map to them. Otherwise implement these:

#### 4.2.1 team_submissions
Represents each time a team is submitted for review.
- `submission_id` PK
- `team_id` FK
- `submitted_by_user_id` FK (leader)
- `status` enum: `pending_review | approved | rejected`
- `submitted_at` datetime
- `reviewed_at` datetime nullable
- `reviewed_by_user_id` nullable
- `review_comment` text nullable

#### 4.2.2 team_submission_files
Files attached to a submission (for audit).  
Even if files live elsewhere, record the association.
- `submission_file_id` PK
- `submission_id` FK
- `file_id` FK
- `uploaded_by_user_id` FK
- `uploaded_at` datetime

#### 4.2.3 team_fix_items
The “blocking” tasks created on rejection.
- `fix_item_id` PK
- `team_id` FK
- `submission_id` FK (the rejected submission)
- `member_user_id` FK (who must fix)
- `reason` text
- `status` enum: `open | resolved`
- `rejected_at` datetime (copy from submission reviewed_at)
- `resolved_at` datetime nullable
- `resolved_by_user_id` nullable (the member)
- `resolution_note` text nullable

> **Important:** A team is blocked from resubmission if **any fix_item.status='open'** exists.

#### 4.2.4 member_uploads (or reuse your existing uploads table)
To resolve fix items we need upload timestamps. If you already have a table for team files, use it.
Minimum required fields:
- `file_id`
- `team_id`
- `uploaded_by_user_id`
- `uploaded_at`

### 4.3 Resubmission gate logic (backend)
Implement backend checks when leader attempts to submit:

**Endpoint:**
- `POST /api/teams/:teamId/submit`

**Server-side checks:**
1) user is team leader
2) all members complete required fields (define required fields explicitly in code)
3) team has at least 1 file (anytime)
4) no open fix items for that team

If (4) fails → return 409 with details:
```json
{
  "error": "TEAM_BLOCKED_BY_FIXES",
  "fixItems": [
    { "memberUserId": 10, "reason": "Blurry photo", "rejectedAt": "..." }
  ]
}
```

### 4.4 Reject workflow (admin)
Admin can reject a pending submission and specify which members must fix.

**Endpoint:**
- `POST /api/admin/requests/:submissionId/reject`

**Body:**
```json
{
  "reviewComment": "Some attachments are invalid",
  "fixItems": [
    { "memberUserId": 10, "reason": "Rename file and upload a clearer version" },
    { "memberUserId": 12, "reason": "Wrong file type; upload PDF" }
  ]
}
```

**Backend must:**
- set submission `status='rejected'`
- set `reviewed_at`, `reviewed_by_user_id`, `review_comment`
- create `team_fix_items` rows for each member in body with:
  - `status='open'`
  - `rejected_at = reviewed_at`

### 4.5 Fix resolution workflow (member upload)
When a member uploads a file, the system must auto-check whether that upload resolves any open fix items for that member.

**Rule:**  
A fix item becomes `resolved` if there exists at least 1 upload where:
- `uploaded_by_user_id = fix_item.member_user_id`
- `team_id = fix_item.team_id`
- `uploaded_at > fix_item.rejected_at`

Implement this in one of these ways (do both):
1) **On upload**: after saving upload, run query to resolve relevant fix items.
2) **On read**: compute “is resolved” and persist if needed (still persist final).

**SQL example (resolve after upload):**
```sql
UPDATE team_fix_items
SET status = 'resolved',
    resolved_at = NOW(),
    resolved_by_user_id = ?
WHERE team_id = ?
  AND member_user_id = ?
  AND status = 'open'
  AND rejected_at < ?; -- the current upload timestamp
```

### 4.6 Approve workflow (admin)
Admin can approve a pending submission:

- `POST /api/admin/requests/:submissionId/approve`
- Backend:
  - set submission `status='approved'`
  - set `reviewed_at`, `reviewed_by_user_id`, `review_comment` (optional)
  - ensure **no open fix items** exist (or auto close them if policy requires; prefer to enforce none exist)

### 4.7 Admin request list and detail pages
Admin UI must include:

#### Request List (`/admin/requests`)
- filters:
  - status: pending/approved/rejected
  - date range
  - search by team name
- table columns:
  - submission id
  - team name
  - submitted at
  - status
  - action: view

#### Request Detail (`/admin/requests/:teamId` or by submission)
Show:
- team info + member list
- latest submission info (status, comment)
- list of files (download links + who uploaded + timestamp)
- fix items list (open/resolved per member)
- actions:
  - Approve
  - Reject (form to add multiple fix items with reasons)

### 4.8 Member/Leader UI changes (non-admin)
Member/Team pages must show:
- Current team verification status:
  - Pending review
  - Rejected (with fix items)
  - Approved
- If rejected:
  - Each member sees only fix items assigned to them
  - Provide upload button
- Team leader sees:
  - summary of all fix items
  - Submit button disabled until none open

---

## 5) Integration Map (What connects to what)

### 5.1 Authentication → Admin redirect
- Login success (frontend) → call `/api/admin/me/access` → route to `/admin` or normal.

### 5.2 Admin route guard
- Any `/admin/*` page load → call `/api/admin/me/access` → if false redirect away.

### 5.3 Admin static management
- Admin UI `/admin/static` calls `/api/admin/static/*`
- File upload calls `/api/files`
- Public site calls `/api/public/static/*`

### 5.4 Admin request management
- Admin UI `/admin/requests` calls `/api/admin/requests` (list)
- Admin UI request detail calls `/api/admin/requests/:submissionId` (detail)
- Actions call `/approve` and `/reject`

### 5.5 Submission gate
- Leader clicks submit → `POST /api/teams/:teamId/submit`
- Server checks open fix items → blocks if needed

### 5.6 Fix items auto resolve
- Member uploads → `POST /api/files` (or team upload endpoint)
- After upload, backend resolves `team_fix_items` for that member if upload is after `rejected_at`

---

## 6) Required API Endpoints (Checklist)

### 6.1 Admin access
- `GET /api/admin/me/access`

### 6.2 Files
- `POST /api/files`
- `GET /api/files/:fileId`

### 6.3 Static admin
- `GET/POST/PUT/DELETE /api/admin/static/sponsors`
- `GET/POST/PUT/DELETE /api/admin/static/rewards`
- `GET /api/admin/static/about`
- `PUT /api/admin/static/about/:id` (or single update)
- `GET/POST/PUT/DELETE /api/admin/static/contacts`
- `GET/POST/PUT/DELETE /api/admin/static/winners`
- `POST /api/admin/static/winners/:id/publish`
- `POST /api/admin/static/winners/:id/unpublish`

### 6.4 Static public
- `GET /api/public/static/sponsors`
- `GET /api/public/static/rewards`
- `GET /api/public/static/about`
- `GET /api/public/static/contacts`
- `GET /api/public/static/winners`

### 6.5 Team requests (admin)
- `GET /api/admin/requests?status=&q=&from=&to=`
- `GET /api/admin/requests/:submissionId`
- `POST /api/admin/requests/:submissionId/approve`
- `POST /api/admin/requests/:submissionId/reject`

### 6.6 Team submissions (member/leader)
- `POST /api/teams/:teamId/submit`
- `GET /api/teams/:teamId/status` (must include current submission status + fix summary)

---

## 7) Acceptance Criteria (Must Pass)
1) Non-admin users cannot access `/admin` or any `/api/admin/*` endpoint.
2) Admin users are redirected to `/admin` after login.
3) Admin can CRUD static content and public site shows updated content.
4) Team leader cannot resubmit when any fix item is open.
5) A fix item becomes resolved only when the assigned member uploads a new file after rejection.
6) Admin can approve only when submissions are valid and fixes are resolved.
7) Auditability: old files remain accessible in history (not hard-deleted).

---

## 8) Implementation Notes (Do This)
- Keep `admin_required` enforcement on backend even if frontend has route guards.
- For timestamps, use server time consistently.
- Return structured error codes for blocked actions (409) so UI can display fix lists.
- Use transactions for approve/reject actions to ensure submission + fix items update atomically.
