# Admin Module Spec (AI-Readable)

> **Scope note:** This document is a strong implementation guide. You do **not** need to follow it 100% if you have a better approach, but you **must** deliver the same capabilities (or improved ones) with clear reasoning.

This project is a **Hackathon static website + membership system** with:
- User authentication (login/register/SSO may exist later)
- Team creation + join requests
- Per-member verification (upload files)
- Team submission for admin review
- Admin content management (Sponsors/Rewards/About/Contacts/Winners)
- Admin review management (verification + return/fix + resubmission + approval)
- Folder + subfolder file organization for verification files

This document defines the **Admin web app/pages**, **backend APIs**, and **database interactions**.

---

## 0) Admin Access Gate (REQUIRED)

### 0.1 Access Rule Source: `access_allowlist`
After a user logs in, the system must decide whether they can access the Admin UI.

**Rule:** A logged-in user is an admin if there is an active record in `access_allowlist` for their identity (recommend: by `user_id`, fallback by `email`).

### 0.2 Where to check (Frontend)
Implement an **Admin Gate** check immediately after login success:
1. Save auth session (token/cookie) normally.
2. Call `GET /api/admin/me` (or equivalent) to fetch admin capability.
3. If the response indicates admin access = true → redirect to `/admin`.
4. If not admin → redirect to normal member area (or homepage).

### 0.3 Where to check (Backend)
All Admin endpoints must enforce:
- user is authenticated
- AND user is in `access_allowlist` and allowed (not revoked, not expired)

**Do not** rely on frontend-only checks.

### 0.4 UI Routing Requirements
Create a **separate Admin area**:
- `/admin/*` routes only
- Must include:
  - Admin Layout (sidebar + topbar)
  - Admin Guard (redirect if not admin)
  - Consistent navigation between modules

---

## 1) Admin App Structure (New UI)

### 1.1 Pages (Must create)
- `/admin` : Admin dashboard
- `/admin/static/*` : Static content management
- `/admin/review/*` : Team review management
- `/admin/audit` : Audit logs (who changed what)
- `/admin/settings` : Site-level settings (deadlines, toggles)

### 1.2 Admin Layout Requirements
- Left sidebar with sections:
  - Dashboard
  - Static Website
    - Sponsors
    - Rewards
    - About
    - Contacts
    - Winners
  - Team Review
    - Review Queue
    - Returned / Waiting Fix
    - Approved Teams
  - Audit Logs
  - Settings
- Top bar:
  - Current admin user display
  - Logout button
- Must be responsive (desktop-first, usable on mobile)

### 1.3 Common UI Components (Must create)
- DataTable with:
  - search
  - filters
  - pagination
- DetailDrawer/DetailPage for item review/edit
- File list viewer:
  - shows filename, type, size, uploaded_at
  - preview for image/pdf (inline)
  - download file
  - download folder as zip (team/member folder)
- Form components with validation:
  - required fields
  - image upload validation (size/type)
- Toast notifications for success/failure

---

## 2) System Split: Two Admin Subsystems

Admin system MUST be separated into:
1) **Static Website Management** (content pages)
2) **Team Review Management** (verification + resubmission workflow)

Each subsystem has its own menu group and pages.

---

# Part A — Static Website Management

## A1) Data Model (Server-side)
Static content must be stored in database tables so admin can update without code changes.
This project previously decided to include:
- Sponsors
- Rewards
- About
- Contacts
- Winners
(Exclude forums/news.)

**All tables must support:**
- created_at, updated_at
- created_by, updated_by (admin user_id)
- soft delete if your project uses it (recommended: deleted_at)

## A2) Sponsors Admin

### A2.1 UI: `/admin/static/sponsors`
Features:
- list sponsors with logo + name + link + display_order + is_active
- create/edit/delete
- reorder sponsors (drag & drop OR up/down buttons)
- upload sponsor logo image

### A2.2 Backend API (Must implement)
- `GET /api/admin/sponsors`
- `POST /api/admin/sponsors`
- `PUT /api/admin/sponsors/:id`
- `DELETE /api/admin/sponsors/:id`
- `POST /api/admin/sponsors/:id/logo` (upload)
- `PUT /api/admin/sponsors/reorder` (bulk update display_order)

### A2.3 Storage
- Store uploaded images in server storage (local disk or object storage).
- Save file metadata in DB (path/url, mime, size, uploaded_at).
- Must sanitize filenames and avoid Thai/unsafe characters in filesystem paths.

## A3) Rewards Admin

### A3.1 UI: `/admin/static/rewards`
Features:
- editable table rows:
  - rank/order
  - title
  - amount (number)
  - currency (string)
  - description/benefits
  - is_active
- add/remove rows
- sort by rank/order

### A3.2 Backend API
- `GET /api/admin/rewards`
- `POST /api/admin/rewards`
- `PUT /api/admin/rewards/:id`
- `DELETE /api/admin/rewards/:id`
- `PUT /api/admin/rewards/reorder`

## A4) About Admin

### A4.1 UI: `/admin/static/about`
Features:
- rich text editor (Markdown or WYSIWYG)
- multilingual if your site supports TH/EN (store `content_th`, `content_en`)
- preview mode

### A4.2 Backend API
- `GET /api/admin/about`
- `PUT /api/admin/about`

## A5) Contacts Admin

### A5.1 UI: `/admin/static/contacts`
Features:
- list contact entries (name, role, phone, email, social links)
- add/edit/delete
- reorder

### A5.2 Backend API
- `GET /api/admin/contacts`
- `POST /api/admin/contacts`
- `PUT /api/admin/contacts/:id`
- `DELETE /api/admin/contacts/:id`
- `PUT /api/admin/contacts/reorder`

## A6) Winners Admin

### A6.1 UI: `/admin/static/winners`
Features:
- manage winners by season/year
- rank, team, project title, description, images, demo link
- publish/unpublish results

### A6.2 Backend API
- `GET /api/admin/winners?season=YYYY`
- `POST /api/admin/winners`
- `PUT /api/admin/winners/:id`
- `DELETE /api/admin/winners/:id`
- `PUT /api/admin/winners/:id/publish` (toggle)

---

# Part B — Team Review Management (Verification + Resubmission)

## B1) Input Data From Applicants (REQUIRED)
Admin review must show:
1) Text profile data: real name, university, phone, email, role in team
2) Attached files per member:
   - multiple files allowed
   - mixed types (pdf/docx/png/etc.)
3) Easy-to-review combined view:
   - team header + list of members with status badges
   - member detail panel with file preview + download

## B2) Folder Structure for Verification Files (REQUIRED)
All verification files MUST be organized as:

- Root folder: `{team_code}`  (from `team_teams.team_code`)
  - Subfolder per member: `{FirstName LastName} ({user_id})`
    - Store that member's uploaded files

**Important rules:**
- Must sanitize folder names (remove unsafe filesystem chars).
- Must ensure uniqueness (append `user_id`).
- Must keep historical files if replaced OR store versions (see B5).  
  You must at least record uploaded_at + file_id so admin can see changes.

## B3) States (REQUIRED)

### B3.1 Member review states
- `PENDING` : not reviewed yet
- `NEED_FIX` : returned, must fix files
- `RESUBMITTED` : member has changed files after `NEED_FIX` (auto-detected)
- `APPROVED` : passed

### B3.2 Team states
- `DRAFT` : not submitted to admin
- `SUBMITTED` : team submitted for review (admin queue)
- `IN_REVIEW` : admin opened and is reviewing (lock)
- `RETURNED` : at least one member is `NEED_FIX`
- `READY_TO_RESUBMIT` : all required members have changed files after return
- `APPROVED` : all members approved and team accepted

## B4) Key Business Rules (REQUIRED)
1) Team leader **cannot submit again** while team is `RETURNED`.
2) A member in `NEED_FIX` must upload/replace files.
3) The system does **not** need to validate content deeply. It must only detect **that files changed**.
4) When every member who was `NEED_FIX` has changed files, team auto-transitions to `READY_TO_RESUBMIT`.
5) When leader submits again, team returns to `SUBMITTED` and admin re-checks only changed members (others remain approved).

## B5) File Change Detection (REQUIRED)
To detect “changed files” without deep inspection:

For each member, store:
- `need_fix_at` timestamp when admin returns them
- `last_upload_at` timestamp updated whenever that member uploads/replaces any file
- optional: `files_fingerprint` (hash of filenames + sizes + updated_at)

**Rule:**
- If `last_upload_at > need_fix_at` then member becomes `RESUBMITTED`.

Team becomes `READY_TO_RESUBMIT` when:
- For all members currently in `NEED_FIX`: they become `RESUBMITTED` (or admin re-approves them).

## B6) Admin UI Pages

### B6.1 Review Queue: `/admin/review/queue`
Table of teams:
- team_code, team_name
- counts: approved / need_fix / pending / resubmitted
- team_state badge
- submitted_at
Actions:
- Open review

Filters:
- team_state
- search by team_code/team_name/university

### B6.2 Team Review Detail: `/admin/review/teams/:team_id`
Layout:
- Left: member list with status badges
- Right: selected member detail:
  - profile info
  - file list with preview/download
  - folder download as zip
  - actions:
    - Approve member
    - Return member (Need Fix) with reason

Team header actions:
- Return team (bulk): mark selected members as NEED_FIX with reason
- Approve team: enabled only when all members are APPROVED

Also display:
- timeline of actions (submitted, opened, returned, resubmitted, approved)
- reviewer/admin who performed each action

### B6.3 Returned Monitor: `/admin/review/returned`
Shows teams in `RETURNED` state:
- who needs fix
- need_fix_at
- resubmission progress (changed or not)
When system detects all required changes:
- team auto-moves to `READY_TO_RESUBMIT` (show in UI immediately)

### B6.4 Approved Teams: `/admin/review/approved`
List of approved teams (for downstream steps like finalist/attendance if needed later).

## B7) Backend APIs (REQUIRED)

### B7.1 Admin identity
- `GET /api/admin/me`
  - returns: { is_admin: boolean, user: {...} }

### B7.2 Team review APIs
- `GET /api/admin/review/teams?state=SUBMITTED`
- `GET /api/admin/review/teams/:team_id`
  - includes members + member states + files list
- `POST /api/admin/review/teams/:team_id/lock`
  - set team to IN_REVIEW with lock owner/time
- `POST /api/admin/review/members/:member_id/approve`
- `POST /api/admin/review/members/:member_id/return`
  - body: { reason: string, checklist?: string[] }
  - sets NEED_FIX + need_fix_at
- `POST /api/admin/review/teams/:team_id/approve`
  - only if all members APPROVED
- `GET /api/admin/review/teams/returned`
- `GET /api/admin/review/teams/ready-to-resubmit`

### B7.3 File APIs
- `GET /api/admin/files/:file_id/download`
- `GET /api/admin/teams/:team_id/folder.zip`
- `GET /api/admin/members/:member_id/folder.zip`
- `GET /api/admin/files/:file_id/preview` (image/pdf inline if possible)

All file endpoints must enforce admin access.

## B8) Database Responsibilities (REQUIRED)
You must support:
- member verification states
- team states
- need_fix_at, last_upload_at tracking per member
- reason text storage for returns
- audit trail:
  - who changed what, and when

Minimum tables/fields to implement (adapt to your existing schema names):
- `access_allowlist`:
  - allowlist_id
  - user_id (nullable if using email)
  - email (nullable if using user_id)
  - is_active
  - created_at, updated_at
- Team:
  - team_id
  - team_code
  - team_state
  - submitted_at
  - updated_at
- Team member verification:
  - member_id
  - team_id
  - user_id
  - verify_state
  - need_fix_reason
  - need_fix_at
  - last_upload_at
  - updated_at
- Files:
  - file_id
  - owner_user_id
  - team_id
  - member_id
  - original_name
  - stored_name/path
  - mime
  - size
  - uploaded_at
  - deleted_at (if soft delete)
- Audit log:
  - audit_id
  - actor_user_id
  - action_type
  - entity_type
  - entity_id
  - payload_json
  - created_at

## B9) Required Auto-Transitions (REQUIRED)
Implement a server-side function that is called whenever a member uploads files:
- Update `last_upload_at`
- If member state is `NEED_FIX` and last_upload_at > need_fix_at:
  - set state to `RESUBMITTED`
- After updating a member, check the team:
  - if team is `RETURNED` and all members who are `NEED_FIX` are now `RESUBMITTED`:
    - set team state to `READY_TO_RESUBMIT`

This must be deterministic and must not require admin manual clicks.

---

## 3) End-to-End Flow Summary

### 3.1 Login → Admin Routing
1) user logs in
2) frontend calls `/api/admin/me`
3) if allowed by `access_allowlist` → route `/admin`
4) else → normal user routes

### 3.2 Team Review
1) leader submits team → team `SUBMITTED`
2) admin opens team → lock → `IN_REVIEW`
3) admin approves/returns members
4) if any returned → team `RETURNED`
5) members re-upload files → auto set member `RESUBMITTED`
6) when all required members resubmitted → team `READY_TO_RESUBMIT`
7) leader submits again → `SUBMITTED`
8) admin re-checks changed members, approve all → team `APPROVED`

---

## 4) Implementation Checklist (Do ALL)

### Frontend (Admin)
- Create `/admin` routes and layout
- Implement Admin Guard using `/api/admin/me`
- Static content CRUD pages
- Review module pages:
  - queue
  - team detail with member list + file viewer
  - returned monitor
  - approved list
- Provide clear status badges and timeline

### Backend
- Implement admin auth middleware using `access_allowlist`
- Implement static content CRUD APIs
- Implement review APIs (team/member state transitions)
- Implement file storage + folder structure
- Implement zip download endpoints
- Implement change detection + auto-transition to READY_TO_RESUBMIT
- Implement audit logging for admin actions

### Database
- Ensure required fields exist for states and timestamps
- Ensure files table supports multiple file types and per-member association
- Ensure allowlist is queryable by user identity

---

## 5) UI/UX Design Requirements (Admin Review Must be Fast)
- One page to review a team: list members left, detail right
- File preview inline where possible (pdf/image)
- One-click approve/return with required reason
- Prominent indicators for RESUBMITTED members
- Do not force admin to download everything to verify

---

## 6) Remove Complexity
- Do NOT implement conflict-of-interest checks.
- Keep the workflow simple and deterministic.
