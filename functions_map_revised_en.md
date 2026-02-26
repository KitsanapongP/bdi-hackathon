# functions_map.md (Revised) — Hackathon System Functions → What to Build (Frontend + Backend + DB)

> **Important note (flexible spec):** You do **NOT** need to follow this document 100%.  
> If you have a better approach (architecture, endpoints, tables, UX, security, workflow), **feel free to recommend it and extend/improve the design**.  
> The goal is: after reading this file, an AI/dev can **start implementing immediately** with clear FE/BE/DB actions.

This document is a practical “implementation map” for a Hackathon web system (mostly static content + member registration, identity verification, team creation, and submissions/review).  
It is based on the original `functions_map.md` structure, but expanded so every subsection clearly states what to build on **Frontend**, **Backend**, and which **DB tables** are involved.

## Shared standards
- Every admin/judge permission must be enforced on the **backend**.
- UI text should support Thai/English via `*_th` / `*_en` fields where applicable.
- Prefer soft-delete (`deleted_at`) for audit-relevant entities (teams, reviews, files).
- All mutation tables should have `created_at`, `updated_at` and ideally `created_by`, `updated_by`.

---

## 0) System Config (do first)

### 0.1 Read global config
**Frontend**
- On app bootstrap call `GET /api/public/configs`.
- Store configs in a global state (e.g., React Context) and use them for:
  - form validation (team size min/max)
  - feature flags (SSO enabled, registration open)
  - page gating (submission windows)

**Backend**
- `GET /api/public/configs`
  - Return only the configs needed by public UI, e.g.:
    - `TEAM_MEMBER_MIN`, `TEAM_MEMBER_MAX`
    - `SSO_ENABLED`
    - `EVENT_YEAR`, `REGISTRATION_OPEN`, `SUBMISSION_OPEN`
  - You may cache results, but must invalidate cache on config updates.

**DB**
- **Reads:** `sys_configs`

---

### 0.2 Update global config (admin-only)
**Frontend**
- `/admin/configs`
  - List key/value + description, editable inputs.
  - Save per key or “save all”.
  - Show backend validation errors.

**Backend**
- `GET /api/admin/configs` (admin-only)
- `PUT /api/admin/configs/:key` (admin-only)
  - Validate type (number/boolean/string)
  - Update DB, bump `updated_at`, optionally store `updated_by`
  - Invalidate config cache

**DB**
- **Reads/Writes:** `sys_configs`

---

## 1) Auth / User (registration + identity)

### 1.1 Local signup (email + password)
**Frontend**
- `/register`
  - Fields: `email`, `password`, `confirmPassword`, `user_name`
  - Client-side validation (format/length/match)
  - Show errors for duplicate email/username

**Backend**
- `POST /api/auth/register`
  - Check email uniqueness in `user_credentials_local`
  - Check username uniqueness in `user_users` (if enforced)
  - Hash password (bcrypt/argon2)
  - Create:
    - `user_users`
    - `user_credentials_local`
    - `user_identities` (local/email identity)
  - Issue token/session and return `user_summary`

**DB**
- **Writes:** `user_users`, `user_credentials_local`, `user_identities`
- **Reads:** `user_credentials_local`, `user_users`

---

### 1.2 Local login
**Frontend**
- `/login` form: email + password
- On success: store token/cookie and redirect to `/dashboard` or `/team`.

**Backend**
- `POST /api/auth/login`
  - Lookup by `user_credentials_local.login_email`
  - Verify password hash
  - Confirm user is active/not deleted
  - Issue JWT/session cookie
- `GET /api/auth/me` (load user + roles after login)

**DB**
- **Reads:** `user_credentials_local`, `user_users`

---

### 1.3 SSO login (OIDC/SAML)
**Frontend**
- “Login with SSO” button on `/login`
- Redirect to `GET /api/auth/sso/start?provider=<code>`
- After callback, backend redirects to FE route (e.g. `/login/sso?success=1`)

**Backend**
- `GET /api/auth/sso/start?provider=...`
  - Redirect to provider authorization endpoint
- `GET /api/auth/sso/callback`
  - Exchange code/assertion → get identifier (subject)
  - Find mapping in `user_sso_accounts`
    - exists → login
    - missing → create/link user and create mapping
  - Issue token/session and redirect back to frontend

**DB**
- **Reads:** `user_sso_providers`, `user_sso_accounts`, `user_users`
- **Writes:** `user_sso_accounts`, `user_identities`, (maybe `user_users`)

---

### 1.4 `.ac.th` email rule
**Frontend**
- For register/profile email fields, read config and enforce `.ac.th` if required.
- Show clear inline validation before submit.

**Backend**
- Always enforce rule on backend too.
- Return 400 with a clear error code/message if invalid.

**DB**
- **Reads:** `sys_configs`
- **Writes:** (optional metadata if you track verification status)

---

### 1.5 Consent (terms acceptance)
**Frontend**
- Gate access: if user hasn’t accepted latest consent, redirect to `/consent`.
- Show current document (TH/EN) and require “Accept”.

**Backend**
- `GET /api/public/consent/current`
- `POST /api/consent/accept`
  - Persist acceptance (doc version, timestamps, etc.)
- Middleware: if consent missing, respond `403 CONSENT_REQUIRED`.

**DB**
- **Reads:** `user_consent_documents`
- **Writes:** `user_consents`

---

### 1.6 Profile edit (TH/EN name, university, phone, email)
**Frontend**
- `/profile` form:
  - real name TH/EN, university TH/EN, phone, email
  - show `.ac.th` rule status if relevant

**Backend**
- `GET /api/profile/me`
- `PUT /api/profile/me`
  - Validate fields
  - If email changes, enforce uniqueness + domain rule

**DB**
- **Reads/Writes:** `user_users`

---

### 1.7 Privacy settings (show/hide)
**Frontend**
- `/privacy` (or inside `/profile`)
  - toggles: show_email, show_phone, show_university, show_real_name, show_social_links

**Backend**
- `GET /api/privacy/me`
- `PUT /api/privacy/me`

**DB**
- **Reads/Writes:** `user_privacy_settings`

---

### 1.8 Social links (Facebook/Instagram/etc.)
**Frontend**
- Inputs on `/profile`, validate URL.

**Backend**
- Save in profile update or separate endpoint.
- Sanitize URLs (block `javascript:` and unsafe schemes).

**DB**
- **Writes:** `user_social_links`

---

### 1.9 Public profile (bio + “looking for team”)
**Frontend**
- `/u/:user_name` public profile:
  - show only data allowed by privacy settings
  - show “Invite/Request to join” if looking-for-team enabled
- Toggle “Looking for team” on `/profile`

**Backend**
- `GET /api/public/users/:user_name` (privacy-filtered)
- `PUT /api/profile/me/looking-for-team`

**DB**
- **Reads:** `user_users`, `user_privacy_settings`, `user_social_links`

---

## 2) Access (Allowlist roles: admin/judge)

### 2.1 Resolve role after login
**Frontend**
- After `GET /api/auth/me`, store roles and conditionally show admin/judge menus.
- Do not rely on menu hiding for security.

**Backend**
- Put roles into JWT claims or always return roles in `/me`.
- Roles come from allowlist mapping.

**DB**
- **Reads:** `access_allowlist`, `user_users`

---

### 2.2 Manage allowlist (admin-only UI)
**Frontend**
- `/admin/access`
  - CRUD: add/remove/update role for an email/user
  - show audit fields

**Backend**
- `GET /api/admin/access-allowlist`
- `POST /api/admin/access-allowlist`
- `PUT /api/admin/access-allowlist/:id`
- `DELETE /api/admin/access-allowlist/:id`

**DB**
- **Reads/Writes:** `access_allowlist`

---

## 3) Team Formation (public/private + join/invite)

### 3.1 Create team (leader)
**Frontend**
- `/team/create`
  - team_name, description, is_public, tags, track/category
  - on success go to team detail

**Backend**
- `POST /api/teams`
  - enforce “one team per user” policy (if required)
  - create team + create first member as leader
  - create initial join code

**DB**
- **Writes:** `team_teams`, `team_members`, `team_join_codes`

---

### 3.2 Generate/rotate join code
**Frontend**
- Team settings (leader only): show current code + “Rotate code” button.

**Backend**
- `POST /api/teams/:team_id/join-code/rotate` (leader-only)
  - expire old code, generate new one

**DB**
- **Writes:** `team_join_codes`

---

### 3.3 Browse public teams / find a team
**Frontend**
- `/teams` listing with search + filters (tag/track)
- show member count and capacity
- actions: “Request to join” or “Ask for invite”

**Backend**
- `GET /api/public/teams?search=&tag=&track=&page=...`
  - return public, not deleted
  - include member count

**DB**
- **Reads:** `team_teams`, `team_members`

---

### 3.4 Join request (user → team)
**Frontend**
- Team detail: “Request to join” form
- Require a short message (reason/intro) before submit.

**Backend**
- `POST /api/teams/:team_id/join-requests`
  - check capacity using config
  - check user not already in a team
  - create join request `pending`

**DB**
- **Writes:** `team_join_requests`
- **Reads:** `team_members`, `sys_configs`

---

### 3.5 Approve/reject join request (leader)
**Frontend**
- Team requests page (leader-only)
  - list requests + approve/reject actions

**Backend**
- `POST /api/teams/:team_id/join-requests/:id/approve`
- `POST /api/teams/:team_id/join-requests/:id/reject`
  - approve adds member + closes request

**DB**
- **Writes:** `team_join_requests`, `team_members`

---

### 3.6 Send invitation (leader → user)
**Frontend**
- Team admin: search user (username/email) and “Invite”
- list sent invites + status

**Backend**
- `POST /api/teams/:team_id/invites`
  - create invite record/token
  - prevent duplicate pending invites

**DB**
- **Writes:** `team_invites`
- **Reads:** `user_users`, `team_members`

---

### 3.7 Accept/decline invitation (invitee)
**Frontend**
- `/invites` list invites received + accept/decline buttons

**Backend**
- `POST /api/team-invites/:invite_id/accept`
- `POST /api/team-invites/:invite_id/decline`
  - accept enforces capacity and “not in another team”

**DB**
- **Writes:** `team_invites`, `team_members`
- **Reads:** `sys_configs`, `team_members`

---

### 3.8 Leave team / remove member / transfer leader
**Frontend**
- Member: “Leave team”
- Leader: remove member + transfer leadership UI
- Prevent leader leaving without transferring first.

**Backend**
- `POST /api/teams/:team_id/leave`
- `POST /api/teams/:team_id/members/:user_id/remove` (leader-only)
- `POST /api/teams/:team_id/transfer-leader` (leader-only)

**DB**
- **Writes:** `team_members`, `team_teams`

---

## 4) Verification (self) — per member, per requirement, per round

### 4.1 Show verification requirements list
**Frontend**
- `/verification` page:
  - list requirements + descriptions/examples/deadlines
  - show status per requirement (not started/submitted/pass/fail)

**Backend**
- `GET /api/verification/requirements`
  - return requirement definitions (TH/EN) + related rules

**DB**
- **Reads:** `verify_requirements`, `sys_configs`

---

### 4.2 Open current verification round (team context)
**Frontend**
- On entering verification, request “current round” for the team.
- If none exists, backend creates it and returns it.

**Backend**
- `POST /api/teams/:team_id/verification-rounds/open`
  - if draft exists → return it
  - else create a new draft round

**DB**
- **Reads/Writes:** `verify_rounds`

---

### 4.3 Member verification profile form (self)
**Frontend**
- Form for identity details required for verification.
- Must allow save and edit until round is locked.

**Backend**
- `GET /api/verification/me?round_id=...`
- `PUT /api/verification/me?round_id=...`
  - validate requirement rules
  - block updates if round locked

**DB**
- **Reads/Writes:** `verify_member_profiles`, `verify_rounds`

---

### 4.4 Upload verification documents (self)
**Frontend**
- Upload UI per requirement (pdf/jpg/png)
- progress indicator + delete/replace until locked

**Backend**
- `POST /api/verification/me/documents` (multipart)
  - validate type/size
  - store file + metadata
- `DELETE /api/verification/me/documents/:id`
- `POST /api/verification/me/documents/:id/replace`

**DB**
- **Writes:** `verify_documents`

---

### 4.5 Team readiness indicator ✅/❌ per member
**Frontend**
- Team detail page shows a matrix: member × requirement status.
- Show “Team ready to submit” only if all requirements satisfied.

**Backend**
- `GET /api/teams/:team_id/verification/status?round_id=...`
  - aggregate profiles + docs + review results

**DB**
- **Reads:** `team_members`, `verify_member_profiles`, `verify_documents`, `review_checks`

---

### 4.6 Lock round & submit for review (leader)
**Frontend**
- “Submit for review” button (leader-only)
- Show checklist + confirm “locking prevents edits”
- After submit: status becomes “under review”

**Backend**
- `POST /api/teams/:team_id/submissions`
  - validate completeness for all members
  - lock round
  - create submission record

**DB**
- **Writes:** `verify_rounds`, `review_submissions`
- **Reads:** `verify_member_profiles`, `verify_documents`, `team_members`

---

## 5) Review workflow (judge/admin)

### 5.1 Admin assigns judges to a submission
**Frontend**
- `/admin/reviews/assign`
  - list pending submissions
  - assign judge(s) from allowlist

**Backend**
- `GET /api/admin/review/submissions?status=pending`
- `POST /api/admin/review/submissions/:id/assign` (admin-only)

**DB**
- **Reads/Writes:** `review_submissions`, `review_assignments`, `access_allowlist`

---

### 5.2 Judge views submission details
**Frontend**
- `/judge/submissions/:id`
  - show team + members + requirements + uploaded documents
  - document download buttons

**Backend**
- `GET /api/judge/submissions/:id`
  - ensure requester is assigned judge
  - return full review payload + signed URLs or streaming endpoints

**DB**
- **Reads:** `review_assignments`, `review_submissions`, `verify_documents`, `verify_member_profiles`, `team_teams`, `team_members`

---

### 5.3 Judge records per-member requirement checks (pass/fail + reason)
**Frontend**
- For each member × requirement:
  - pass/fail selector
  - require reason when fail
  - autosave or explicit save

**Backend**
- `PUT /api/judge/submissions/:id/checks`
  - upsert check records with `checked_by`, `checked_at`

**DB**
- **Writes:** `review_checks`

---

### 5.4 Judge submits final decision (approved/returned/rejected)
**Frontend**
- “Submit decision” button
- require reason when returned/rejected
- lock the review (policy) after submission

**Backend**
- `POST /api/judge/submissions/:id/decision`
  - ensure checks completed
  - store decision and update submission status

**DB**
- **Writes:** `review_decisions`, `review_submissions`

---

### 5.5 Returned flow: fix failed items and resubmit
**Frontend**
- If submission returned:
  - show exactly which member/requirement failed and why
  - allow edits/uploads only for relevant items (or allow all, but highlight failed)
  - leader can “Resubmit”

**Backend**
- `POST /api/teams/:team_id/submissions/:submission_id/resubmit`
  - create a new submission referencing parent submission
  - create a new verification round or re-open with constraints
  - preserve history/audit trail

**DB**
- **Writes:** `review_submissions`, `verify_rounds` (new), `review_checks` (new round)

---

## 6) Finalist phase (approved teams only)

### 6.1 Finalist UI after approval
**Frontend**
- `/finalist` page visible only for approved teams
- show slot status, attendance deadline, next steps

**Backend**
- `GET /api/finalist/me`
  - ensure team is approved
  - return slot + round info + member confirmations

**DB**
- **Reads:** `review_decisions`, `event_participation_rounds`, `event_finalist_slots`, `event_attendance_confirmations`

---

### 6.2 Admin creates participation round
**Frontend**
- `/admin/finalists/rounds` CRUD:
  - round name, deadlines, slot counts

**Backend**
- `POST /api/admin/finalist/rounds`
- `GET /api/admin/finalist/rounds`

**DB**
- **Writes:** `event_participation_rounds`

---

### 6.3 Admin offers slots + reserve list
**Frontend**
- Admin selects approved teams and orders them as offered/reserve

**Backend**
- `POST /api/admin/finalist/slots`

**DB**
- **Writes:** `event_finalist_slots`

---

### 6.4 Member confirms attendance (self)
**Frontend**
- `/finalist/confirm` per member confirm/decline

**Backend**
- `POST /api/finalist/attendance/confirm`
  - enforce deadline

**DB**
- **Writes:** `event_attendance_confirmations`

---

### 6.5 Final slot finalize/promotion logic
**Frontend**
- Admin page shows which teams confirmed fully, which missed deadline, who gets promoted from reserve

**Backend**
- `POST /api/admin/finalist/slots/:slot_id/finalize`
- Job/admin endpoint:
  - forfeit missed deadline
  - promote reserve to offered

**DB**
- **Writes:** `event_finalist_slots`, `event_attendance_confirmations`

---

## 7) Announcements / Notifications (in-app + email)

### 7.1 Admin creates announcement
**Frontend**
- `/admin/announcements/create`
  - title_th/en, content_th/en, publish_at, channels (in-app/email)

**Backend**
- `POST /api/admin/announcements`
- `PUT /api/admin/announcements/:id`
- `GET /api/admin/announcements`

**DB**
- **Writes:** `notify_announcements`

---

### 7.2 Target announcements to teams
**Frontend**
- Multi-select teams or “all teams”, show counts.

**Backend**
- `POST /api/admin/announcements/:id/targets`

**DB**
- **Writes:** `notify_announcement_targets`

---

### 7.3 In-app announcements list (per user/team)
**Frontend**
- `/announcements` list + read/unread badge
- mark as read

**Backend**
- `GET /api/announcements` (for logged-in user)
- `POST /api/announcements/:id/read`

**DB**
- **Reads:** `notify_announcements`, `notify_announcement_targets`, `team_members`
- **Writes:** `notify_reads`

---

### 7.4 Send announcement emails
**Frontend**
- “Send email” button with preview and progress

**Backend**
- `POST /api/admin/announcements/:id/send-email`
  - expand teams → users
  - render template (th/en)
  - send via SMTP/provider
  - store per-recipient logs

**DB**
- **Reads:** `notify_announcement_targets`, `team_members`, `user_users`
- **Writes:** `notify_email_jobs`, `notify_email_logs`

---

## 8) Team Drive (nested folders + uploads)

### 8.1 Ensure team root folder exists
**Frontend**
- `/team/:id/drive` should always show a root folder; request creation if missing.

**Backend**
- `POST /api/teams/:team_id/drive/root`
  - idempotent: returns existing root or creates a new one

**DB**
- **Writes:** `drive_folders`

---

### 8.2 Create nested folder
**Frontend**
- “New folder” in current folder + breadcrumbs/tree.

**Backend**
- `POST /api/drive/folders`
  - team membership permission check

**DB**
- **Writes:** `drive_folders`

---

### 8.3 Upload file to a folder
**Frontend**
- upload with progress + retry

**Backend**
- `POST /api/drive/files` (multipart)
  - permission + size/mime validation
  - store file + metadata

**DB**
- **Writes:** `drive_files`

---

### 8.4 Replace file (versioning)
**Frontend**
- “Replace” button + version history view

**Backend**
- `POST /api/drive/files/:id/replace`
  - create version record and update current pointer

**DB**
- **Writes:** `drive_file_versions`, `drive_files`

---

### 8.5 Delete file/folder (soft delete)
**Frontend**
- delete with confirmation
- define policy: recursive delete or “cannot delete non-empty folder” and implement fully

**Backend**
- `DELETE /api/drive/files/:id`
- `DELETE /api/drive/folders/:id`
  - soft delete + audit fields

**DB**
- **Writes:** `drive_files`, `drive_folders`

---

## 9) Schedule page (editable schedule)

### 9.1 Public schedule listing
**Frontend**
- `/schedule` grouped by day/time, bilingual.

**Backend**
- `GET /api/public/schedule`

**DB**
- **Reads:** `event_schedule_days`, `event_schedule_items`

---

### 9.2 Admin CRUD schedule
**Frontend**
- `/admin/schedule` CRUD days and items; support ordering (at least `sort_order`).

**Backend**
- CRUD endpoints for days/items:
  - `POST/PUT/DELETE /api/admin/schedule/days`
  - `POST/PUT/DELETE /api/admin/schedule/items`

**DB**
- **Writes:** `event_schedule_days`, `event_schedule_items`

---

## 10) Admin UI — minimum management screens

### 10.1 Admin dashboard (counts)
**Frontend**
- `/admin` cards:
  - users, teams, pending/approved/returned submissions, finalist confirmations

**Backend**
- `GET /api/admin/dashboard` (single aggregated payload)

**DB**
- **Reads:** `user_users`, `team_teams`, `review_submissions`, `review_decisions`, `event_finalist_slots`, `event_attendance_confirmations`

---

### 10.2 Manage users
**Frontend**
- `/admin/users` list + search/filter + detail view

**Backend**
- `GET /api/admin/users`
- `GET /api/admin/users/:id`

**DB**
- **Reads:** `user_users`, `team_members`, `verify_member_profiles`, `review_checks`

---

### 10.3 Manage teams
**Frontend**
- `/admin/teams` list + team detail + ability to deactivate (soft)

**Backend**
- `GET /api/admin/teams`
- `GET /api/admin/teams/:id`
- `PUT /api/admin/teams/:id/status`

**DB**
- **Reads/Writes:** `team_teams`, `team_members`

---

### 10.4 Manage verification & review
**Frontend**
- `/admin/reviews` list submissions + assignment + drill-down

**Backend**
- admin read endpoints for all review/verification objects

**DB**
- **Reads:** `review_*`, `verify_*`

---

### 10.5 Manage finalists
**Frontend**
- `/admin/finalists` rounds/slots/confirmations

**Backend**
- all finalist endpoints in section 6

**DB**
- **Reads/Writes:** `event_*`

---

### 10.6 Manage announcements
**Frontend**
- `/admin/announcements` list/create/edit/send

**Backend**
- all notify endpoints in section 7

**DB**
- **Reads/Writes:** `notify_*`

---

### 10.7 Manage schedule
**Frontend**
- `/admin/schedule` (section 9.2)

**Backend**
- schedule admin endpoints (section 9.2)

**DB**
- **Reads/Writes:** `event_schedule_*`

---

## Quick Reference: Feature → Tables
- **Configs:** `sys_configs`
- **Auth/User:** `user_users`, `user_credentials_local`, `user_identities`, `user_sso_providers`, `user_sso_accounts`
- **Consent/Privacy/Social:** `user_consent_documents`, `user_consents`, `user_privacy_settings`, `user_social_links`
- **Access roles:** `access_allowlist`
- **Teams:** `team_teams`, `team_members`, `team_join_codes`, `team_join_requests`, `team_invites`
- **Verification:** `verify_requirements`, `verify_rounds`, `verify_member_profiles`, `verify_documents`
- **Review:** `review_submissions`, `review_assignments`, `review_checks`, `review_decisions`
- **Finalists:** `event_participation_rounds`, `event_finalist_slots`, `event_attendance_confirmations`
- **Notifications:** `notify_announcements`, `notify_announcement_targets`, `notify_reads`, `notify_email_jobs`, `notify_email_logs`
- **Drive:** `drive_folders`, `drive_files`, `drive_file_versions`
- **Schedule:** `event_schedule_days`, `event_schedule_items`
