# Design Project Tracker

Internal web app for the Applab design department: project tracking, time logging with discussion threads, Figma links, skills, team availability and a suggestions corner — with role-based access for the Design Head, Design Managers, Associate Designers and Mid Designers.

**Stack:** Next.js 15 (App Router) · TypeScript · Tailwind CSS v4 + shadcn/ui · Figtree font (self-hosted) · Prisma 7 · PostgreSQL (hosted on Railway) · NextAuth (credentials) · Recharts

---

## Quick start on a Mac (localhost)

1. Install **Node.js LTS** (nodejs.org) and **Postgres.app** (postgresapp.com). Open Postgres.app and click **Initialize** / **Start**.
2. Unzip the project, open Terminal in the `design-project-tracker` folder and run:
   ```bash
   bash scripts/setup-local.sh
   npm run dev
   ```
3. Open http://localhost:3000 and sign in as `prasun@applab.qa` / `Password123!`.

The script creates a `design_tracker` database, writes `.env`, installs packages, creates the tables and loads the sample team. Run it again any time to reset the local data (`SKIP_SEED=1 bash scripts/setup-local.sh` keeps your data).

## 1. Setup

The app uses **PostgreSQL**. Requirements: **Node.js 20.19+** (22 LTS recommended), npm, and a Postgres database — a Railway Postgres (see **Deploy to Railway** below) or a local one.

```bash
npm install                 # also runs `prisma generate`
cp .env.example .env        # then put your Postgres URL in DATABASE_URL
npm run setup               # creates the tables + loads the Applab team and sample data
npm run dev                 # http://localhost:3000
```

Use a separate database for local development — never point your laptop at the live one.

| Script | What it does |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm start` | Apply pending migrations, then serve (used by Railway) |
| `npm run setup` | Apply migrations + seed (first run) |
| `npm run db:seed` | Re-seed (wipes and recreates all data) |
| `npm run db:reset` | Drop the database, re-apply migrations, seed |
| `npm run db:migrate:dev` | Create a new migration after editing `prisma/schema.prisma` |
| `npm run db:copy-from-sqlite` | One-off: copy data from the old SQLite `dev.db` into `DATABASE_URL` |
| `npm run typecheck` / `npm run lint` | Type-check / lint |

### Environment variables

| Variable | Example | Notes |
| --- | --- | --- |
| `DATABASE_URL` | `postgresql://user:pass@host:5432/railway` | Required at runtime |
| `NEXTAUTH_SECRET` | output of `openssl rand -base64 32` | Required. Signs session tokens |
| `NEXTAUTH_URL` | `https://tracker-production.up.railway.app` | Public URL of the app |
| `APP_TIMEZONE` | `Asia/Qatar` | Defines "today", the Mon–Sun week and the 7-day backdate window |
| `VAPID_PUBLIC_KEY` | from `npx web-push generate-vapid-keys` | Optional. Turns on browser push notifications |
| `VAPID_PRIVATE_KEY` | (same command) | Optional. Keep secret |
| `VAPID_SUBJECT` | `mailto:design@applab.qa` | Optional. Contact address sent to push services |

---

## Deploy to Railway

1. **Project:** railway.com → New Project → Deploy from GitHub repo → `arun-applab/tracker`.
2. **Database:** + New → Database → **PostgreSQL**.
3. **App variables** (tracker service → Variables):
   - `DATABASE_URL` = `${{Postgres.DATABASE_URL}}`
   - `NEXTAUTH_SECRET` = a long random string
   - `NEXTAUTH_URL` = the domain from Settings → Networking → Generate Domain (with `https://`)
   - `APP_TIMEZONE` = `Asia/Qatar`
   - Push notifications (optional): run `npx web-push generate-vapid-keys` once on your Mac and add `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` and `VAPID_SUBJECT` (`mailto:you@applab.qa`). Generate them once and keep them — changing them later means everyone has to turn notifications on again.
4. **Deploy.** Railway runs `npm install` → `npm run build` → `npm start`. `npm start` runs `prisma migrate deploy` first, so the tables are created automatically on the first deploy.
5. **Data** (from your Mac, using the Postgres service's `DATABASE_PUBLIC_URL`):
   - Your existing data: `DATABASE_URL="<DATABASE_PUBLIC_URL>" npm run db:copy-from-sqlite` — copies everything from `dev.db` in one transaction. It refuses to run if the database already has users (add `-- --force` to wipe and copy again).
   - Or a fresh start: `DATABASE_URL="<DATABASE_PUBLIC_URL>" npm run db:seed`

Every later `git push` to `main` redeploys; new migrations are applied automatically on start.

---

## 2. Default logins

Every seeded account uses the password **`Password123!`** — change these before real use (the Design Head can reset passwords under **Users & Skills**).

The people and reporting lines come from the Applab design team chart:

| Role | Name | Email |
| --- | --- | --- |
| Design Head | Prasun Sachan | `prasun@applab.qa` |
| Design Manager | Jinu Kumar · UI Design Team Lead | `jinu@applab.qa` |
| Design Manager | Sanya Munam · UX Lead & Project Manager | `sanya@applab.qa` |
| Design Manager | Ishak Syed | `ishak@applab.qa` |
| Design Manager | Nandakumar Parapurath | `nanda@applab.qa` |
| Design Manager | Salman Hameed | `salman.hameed@applab.qa` |
| Design Manager | Arun Lal M K | `arun.l@applab.qa` |
| Design Manager | Hisham J Alturbaq | `hisham@applab.qa` |
| Design Manager (no team yet) | Mohamed Inshaf | `inshaf@applab.qa` |
| Design Manager (no team yet) | Sumesh Sugathan | `sumesh@applab.qa` |
| Associate Designer (Arun's team) | Akash M | `akash.m@applab.qa` |
| Mid Designer · UI Designer (Ishak's team) | Asma Belazi | `asma.b@applab.qa` |
| Mid Designer · UX Specialist (Sanya's team) | Aditya Sharma | `aditya.s@applab.qa` |

All 16 designers are seeded with the emails from the team list (e.g. `ajay.v@`, `rusna.f@`, `dilshikka@`, `shehab.b@`). Emails are case-insensitive at sign-in. Titles that start with "Associate" become **Associate Designer**; the others (UI Designer, UX Specialist) become **Mid Designer** — the job title is shown everywhere.

Projects, time entries, comments, starter skills and suggestions are **sample data** so every screen has content. Delete or replace them freely.

---

## 3. How the workflow works

| | Design Head | Design Manager | Associate Designer / Mid Designer |
| --- | --- | --- | --- |
| Projects | Creates projects (approved straight away), edits details, assigns **one or more** Design Managers; **approves or declines** managers' project requests; sees **all** projects | Sees projects assigned to them; **requests new projects** (they wait for the Head's approval); once approved, **onboards people from their own team or borrows from any other team** and changes status | Sees only projects they're onboarded to (including ones they're borrowed into) |
| Figma links | View / add / remove any | View / add; remove own or on their projects | View / add; remove own |
| Time | Views all entries; comments on any entry | Logs **own** time and time for **own team** on their projects; edits any entry on their projects | Logs own time; edits/deletes own entries for **7 days** |
| Hours per person | All projects | Projects they manage | — (only their own timesheet and hours) |
| Entry discussion | Comment on any entry | Ask about entries on their projects | Reply on their own entries |
| Availability | Set anyone's | Set own + own team's | Set own |
| Skills | Add / edit skills for everyone (incl. self and managers) | View | View own (account menu) |
| Users | Manage everyone, **change roles** (Design Manager / Mid Designer / Associate Designer) | Add people to own team; edit name, email, job title (not roles) | — |
| Password | Change own; set anyone's in Users & Skills | Change own (account menu → Change password) | Change own |
| Suggestions | Inbox, threaded replies, status | Submit (optionally anonymous), reply | — |

Rules are enforced **server-side** in `src/server/permissions.ts` and the services in `src/server/services/*`; the UI only hides what the API would refuse anyway.

### Project requests (Design Manager → Design Head)

1. A Design Manager clicks **Request project** (Projects page or dashboard). They're assigned to it automatically and can add co-managers.
2. The project is **Awaiting approval**: the Head gets a notification and sees it at the top of the dashboard and Projects page. Nobody can be onboarded, the status can't change and no time can be logged yet.
3. The Head **approves** it (managers are notified and can onboard designers) or **declines** it with a reason. A declined request shows the reason; the manager edits it and it's resubmitted automatically.
4. Projects the Head creates are approved straight away.

### Notifications

The bell in the top bar shows notifications (live — checked every 20 seconds and whenever the tab gets focus, with a pop-up toast for anything new) and a **Replies** tab for time-entry threads waiting on you. You're notified when:

- a project request is submitted / resubmitted (Head), approved or declined (manager)
- you're assigned to a project (manager), onboarded or removed (designer), or someone from your team is borrowed (home manager)
- a project's status changes (its team and the Head)
- someone comments on a time entry you're part of, or a manager logs time for you
- your availability is changed by someone else
- suggestions: new ones and replies (Head), replies and status changes (author)

**Browser push:** with the `VAPID_*` variables set, the bell has a **Turn on** button that asks the browser for permission; after that notifications pop up on the desktop/phone even when the tab is closed. Each person turns it on per browser. (Push needs HTTPS — fine on Railway; on iPhone it works only when the site is added to the Home Screen.)

### Sorting

Tables sort by clicking a column header (click again to flip). Lists default to newest first (time entries by date, projects by creation date, suggestions by latest activity); people tables default to role, then name. Projects and Suggestions also have a sort menu.

### Time entries

- Hours in 0.5 steps; task description required; task types Design / Revision / Meeting / Research / Other.
- Max **12 h per person per day** across all projects. No future dates. Up to **7 days back** (managers can override when logging for their team).
- **No approval step.** Every entry has a comment thread: a manager asks a question, the person replies. Threads waiting for you show on the bell in the top bar, on your dashboard, and as a red comment chip in log tables.
- The owner can edit/delete their entry for 7 days; after that only the project's Design Manager can change it.

### Theme colour

All dark buttons, active nav pills and dark tiles use one gradient token. Change `--ink-start` and `--ink-end` at the top of `src/app/globals.css` to re-theme them.

### Availability

With a filter on (e.g. click **Available**), only teams that have someone matching are shown.

Everyone sets their status from the **status pill in the top bar** (Available, Partially Available, Occupied, On Leave, or *Automatic*). Automatic = from active projects: any In Progress / Under Review project → Occupied; only Not Started / On Hold → Partially Available; none → Available. Managers can change their team's status from **Availability** or **My Team**; the badge shows whether it was set by the person or by someone else.

### Decisions made where the request was open

- Design Managers are working designers too, so they log their own time (My Timesheet) on projects they manage.
- **Borrowing:** any assigned Design Manager can onboard people from another team. Borrowed people are tagged "Borrowed from X's team", sit in the borrowing manager's column, and their hours count as "Borrowed" in the project's own-team / borrowed split. The borrowing manager can log time for them; the lending manager sees where their people are borrowed and the hours logged (My Team → Lent to other teams) but can't open the project. The Design Head's dashboard shows a cross-team summary.
- A manager can only remove people they onboarded or people from their own team. Removing a manager from a project also removes the people they onboarded (logged hours are kept).
- "Overdue" = past ETA and not Completed or Cancelled.
- Prasun Sachan's email wasn't in the list, so it's seeded as `prasun@applab.qa` — change it under Users & Skills if different. Khalil El-Hayek and Rashim Perumbumkattil are not seeded (add them under Users & Skills if needed).

---

## Moved from SQLite

Earlier versions stored data in a local SQLite file (`dev.db`). The schema now targets PostgreSQL and the migrations were regenerated for it (`prisma/migrations/20261015120000_init_postgres`). To bring old data across, use `npm run db:copy-from-sqlite` (see Deploy to Railway, step 5). Keep `dev.db` until you've confirmed the copy.

---

## 5. Project structure

```
prisma/
  schema.prisma          all models, relations and enums
  migrations/            SQL migrations (SQLite)
  seed.ts                sample data
prisma.config.ts         Prisma CLI config (schema path, DATABASE_URL, seed command)
src/
  app/
    login/               sign-in page
    (app)/               authenticated pages (sidebar layout)
      page.tsx           role-specific dashboards
      projects/          list, detail, new, edit
      timesheet/         My Timesheet (weekly grid) + history
      time-logs/         all logs (Head) / logs on my projects (Manager)
      availability/      per-team availability tables
      team/              manager: my team (availability, skills)
      users/             head: users & skills
      suggestions/       inbox / my submissions + threads
    api/                 JSON API (all role-checked)
  server/
    permissions.ts       the access rules
    services/            business logic per feature
  components/ui/         shadcn/ui primitives
  components/app/        app components (tables, dialogs, badges, charts)
  lib/constants.ts       labels + the single source of status colours
```

### API overview

| Method & path | Purpose |
| --- | --- |
| `GET/POST /api/projects` | List (scoped by role) / create |
| `GET/PATCH /api/projects/:id` | Detail / update |
| `POST /api/projects/:id/status` | Change status (logged to history) |
| `PUT /api/projects/:id/members` | Onboard / offboard (manager: own team only) |
| `GET/POST /api/time-logs` | List with filters / create |
| `PATCH/DELETE /api/time-logs/:id` | Edit / delete |
| `GET/POST /api/time-logs/:id/comments` | Entry discussion thread |
| `POST /api/projects/:id/review` | Head: approve / decline a project request (`{ decision, note }`) |
| `GET /api/notifications`, `POST /api/notifications/read` | Notification feed (+ threads waiting for your reply) / mark read |
| `POST/DELETE /api/push` | Register / remove this browser for push |
| `POST /api/me/password` | Change your own password |
| `POST /api/projects/:id/links`, `DELETE …/links/:linkId` | Figma links |
| `PUT /api/users/:id/skills`, `GET /api/skills` | Skills |
| `GET/POST /api/users`, `PATCH /api/users/:id` | User management |
| `PUT /api/users/:id/availability` | Set availability (self, home manager or Head) |
| `GET /api/availability` | All teams' availability |
| `GET/POST /api/suggestions`, `GET/PATCH /api/suggestions/:id`, `POST /api/suggestions/:id/replies` | Suggestions corner |

---

## 6. Extending

- **New project status / task type / category:** add the value to the enum in `schema.prisma`, run `npm run db:migrate:dev`, then add its label and colour in `src/lib/constants.ts`.
- **New shadcn/ui components:** `components.json` is set up, so `npx shadcn@latest add <component>` works.
