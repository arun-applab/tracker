# Design Project Tracker

Internal web app for the Applab design department: project tracking, time logging with discussion threads, Figma links, skills, team availability and a suggestions corner — with role-based access for the Design Head, Design Managers, Associate Designers and Team Members.

**Stack:** Next.js 15 (App Router) · TypeScript · Tailwind CSS v4 + shadcn/ui · Figtree font (self-hosted) · Prisma 7 · PostgreSQL (hosted on Railway) · NextAuth (credentials) · Recharts

---

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

---

## Deploy to Railway

1. **Project:** railway.com → New Project → Deploy from GitHub repo → `arun-applab/tracker`.
2. **Database:** + New → Database → **PostgreSQL**.
3. **App variables** (tracker service → Variables):
   - `DATABASE_URL` = `${{Postgres.DATABASE_URL}}`
   - `NEXTAUTH_SECRET` = a long random string
   - `NEXTAUTH_URL` = the domain from Settings → Networking → Generate Domain (with `https://`)
   - `APP_TIMEZONE` = `Asia/Qatar`
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
| Team Member · UI Designer (Ishak's team) | Asma Belazi | `asma.b@applab.qa` |
| Team Member · UX Specialist (Sanya's team) | Aditya Sharma | `aditya.s@applab.qa` |

All 16 designers are seeded with the emails from the team list (e.g. `ajay.v@`, `rusna.f@`, `dilshikka@`, `shehab.b@`). Emails are case-insensitive at sign-in. Titles that start with "Associate" become **Associate Designer**; the others (UI Designer, UX Specialist) become **Team Member** — the job title is shown everywhere.

Projects, time entries, comments, starter skills and suggestions are **sample data** so every screen has content. Delete or replace them freely.

---

## 3. How the workflow works

| | Design Head | Design Manager | Associate Designer / Team Member |
| --- | --- | --- | --- |
| Projects | Creates projects, edits details, assigns **one or more** Design Managers; sees **all** projects | Sees only projects assigned to them; **onboards people from their own team or borrows from any other team**; changes status; **cannot create** projects | Sees only projects they're onboarded to (including ones they're borrowed into) |
| Figma links | View / add / remove any | View / add; remove own or on their projects | View / add; remove own |
| Time | Views all entries; comments on any entry | Logs **own** time and time for **own team** on their projects; edits any entry on their projects | Logs own time; edits/deletes own entries for **7 days** |
| Hours per person | All projects | Projects they manage | — (only their own timesheet and hours) |
| Entry discussion | Comment on any entry | Ask about entries on their projects | Reply on their own entries |
| Availability | Set anyone's | Set own + own team's | Set own |
| Skills | Add / edit skills for everyone (incl. self and managers) | View | View own (account menu) |
| Users | Manage everyone | Add / edit people in own team | — |
| Suggestions | Inbox, threaded replies, status | Submit (optionally anonymous), reply | — |

Rules are enforced **server-side** in `src/server/permissions.ts` and the services in `src/server/services/*`; the UI only hides what the API would refuse anyway.

### Time entries

- Hours in 0.5 steps; task description required; task types Design / Revision / Meeting / Research / Other.
- Max **12 h per person per day** across all projects. No future dates. Up to **7 days back** (managers can override when logging for their team).
- **No approval step.** Every entry has a comment thread: a manager asks a question, the person replies. Threads waiting for you show on the bell in the top bar, on your dashboard, and as a red comment chip in log tables.
- The owner can edit/delete their entry for 7 days; after that only the project's Design Manager can change it.

### Theme colour

All dark buttons, active nav pills and dark tiles use one gradient token. Change `--ink-start` and `--ink-end` at the top of `src/app/globals.css` to re-theme them.

### Availability

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
| `GET /api/inbox` | Threads waiting for your reply |
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
