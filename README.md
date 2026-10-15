# Design Project Tracker

Internal web app for the Applab design department: project tracking, time logging with discussion threads, Figma links, skills, team availability and a suggestions corner — with role-based access for the Design Head, Design Managers, Associate Designers and Team Members.

**Stack:** Next.js 15 (App Router) · TypeScript · Tailwind CSS v4 + shadcn/ui · Figtree font · Prisma 7 (SQLite locally, PostgreSQL-ready) · NextAuth (credentials) · Recharts

---

## 1. Setup

Requirements: **Node.js 20.19+** (22 LTS recommended) and npm.

```bash
npm install                 # also runs `prisma generate`
cp .env.example .env        # skip if .env already exists
npm run setup               # creates dev.db from migrations + seeds sample data
npm run dev                 # http://localhost:3000
```

Before using it beyond your laptop, set `NEXTAUTH_SECRET` in `.env` to a long random string (`openssl rand -base64 32`).

| Script | What it does |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` / `npm start` | Production build / serve |
| `npm run setup` | Apply migrations + seed (first run) |
| `npm run db:seed` | Re-seed (wipes and recreates all data) |
| `npm run db:reset` | Drop the database, re-apply migrations, seed |
| `npm run db:migrate:dev` | Create a new migration after editing `prisma/schema.prisma` |
| `npm run typecheck` / `npm run lint` | Type-check / lint |

### Environment variables

| Variable | Default | Notes |
| --- | --- | --- |
| `DATABASE_URL` | `file:./dev.db` | SQLite file, or a `postgresql://` URL |
| `NEXTAUTH_SECRET` | — | Required. Signs session tokens |
| `NEXTAUTH_URL` | `http://localhost:3000` | Public URL of the app |
| `APP_TIMEZONE` | `Asia/Qatar` | Defines "today", the Mon–Sun week and the 7-day backdate window |

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
| Projects | Creates projects, edits details, assigns **one or more** Design Managers; sees **all** projects | Sees only projects assigned to them; **onboards people from their own team**; changes status; **cannot create** projects | Sees only projects they're onboarded to |
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

### Availability

Everyone sets their status from the **status pill in the top bar** (Available, Partially Available, Occupied, On Leave, or *Automatic*). Automatic = from active projects: any In Progress / Under Review project → Occupied; only Not Started / On Hold → Partially Available; none → Available. Managers can change their team's status from **Availability** or **My Team**; the badge shows whether it was set by the person or by someone else.

### Decisions made where the request was open

- Design Managers are working designers too, so they log their own time (My Timesheet) on projects they manage.
- A manager onboards only from their own team; cross-team work happens by the Head assigning several managers to one project. Removing a manager from a project also removes the people they onboarded (logged hours are kept).
- "Overdue" = past ETA and not Completed or Cancelled.
- Prasun Sachan's email wasn't in the list, so it's seeded as `prasun@applab.qa` — change it under Users & Skills if different. Khalil El-Hayek and Rashim Perumbumkattil are not seeded (add them under Users & Skills if needed).

---

## Upgrading an existing install

The v2 workflow adds a migration (`20261015000000_workflow_v2`). From the project folder:

```bash
npm install
npm run db:reset     # drops the dev database, applies all migrations, loads the Applab team
npm run dev
```

`npx prisma migrate deploy` also works if you want to keep existing data — each project's old owning manager becomes its assigned manager.

---

## 4. Switching to PostgreSQL

The runtime picks its database driver from `DATABASE_URL` automatically (`src/lib/db.ts`), so only three things change:

1. **Schema** — in `prisma/schema.prisma` set:
   ```prisma
   datasource db {
     provider = "postgresql"
   }
   ```
2. **Env** — point `DATABASE_URL` at Postgres:
   ```
   DATABASE_URL="postgresql://user:password@localhost:5432/design_tracker?schema=public"
   ```
3. **Migrations** — the shipped migration is SQLite SQL, so start a fresh history:
   ```bash
   rm -rf prisma/migrations
   npx prisma migrate dev --name init   # creates Postgres migration + tables
   npm run db:seed
   ```

Optional: Postgres string matching is case-sensitive; add `mode: "insensitive"` to the `contains` filters in `src/server/services/projects.ts` (`listProjects`) for case-insensitive project search.

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
