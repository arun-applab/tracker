/**
 * Seed data for Design Project Tracker — Applab design team structure.
 * Run with `npm run db:seed` (also runs as part of `npm run db:reset`).
 *
 * People and reporting lines come from the "Design team reporting structure" chart.
 * Projects, time logs, comments and suggestions are SAMPLE data so every screen has
 * something to show; dates are relative to "today" so dashboards always look current.
 */
import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import type { Priority, ProjectStatus, Role, TaskType } from "../src/generated/prisma/enums";

const url = process.env.DATABASE_URL ?? "file:./dev.db";
const db = new PrismaClient({
  adapter: url.startsWith("postgres") ? new PrismaPg({ connectionString: url }) : new PrismaBetterSqlite3({ url }),
});

export const SEED_PASSWORD = "Password123!";
const TZ = process.env.APP_TIMEZONE || "Asia/Qatar";

// ─── Date helpers ────────────────────────────────────────────────────────────
const DAY = 86_400_000;
const todayIso = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
const T = new Date(`${todayIso}T00:00:00.000Z`);
const d = (offset: number) => new Date(T.getTime() + offset * DAY);
const dow = (date: Date) => date.getUTCDay(); // 0 Sun … 6 Sat
const at = (date: Date, hour: number) => new Date(date.getTime() + hour * 3_600_000);

let seed = 20261015;
function rand() {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const pick = <X,>(arr: readonly X[]) => arr[Math.floor(rand() * arr.length)];
const halfHours = (min: number, max: number) => Math.round((min + rand() * (max - min)) * 2) / 2;

// ─── People (from the reporting-structure chart) ─────────────────────────────
type PersonSeed = { key: string; name: string; email: string; title: string };
type TeamSeed = PersonSeed & { people: PersonSeed[] };

const HEAD: PersonSeed = { key: "prasun", name: "Prasun Sachan", email: "prasun@applab.qa", title: "Head of Design" };

const TEAMS: TeamSeed[] = [
  {
    key: "jinu", name: "Jinu Kumar", email: "jinu@applab.qa", title: "UI Design Team Lead",
    people: [{ key: "ajay", name: "Ajay V A", email: "ajay.v@applab.qa", title: "Associate UI Designer" }],
  },
  {
    key: "sanya", name: "Sanya Munam", email: "sanya@applab.qa", title: "UX Lead & Project Manager",
    people: [
      { key: "rusna", name: "Rusna Fazli", email: "rusna.f@applab.qa", title: "Associate UX Specialist" },
      { key: "sama", name: "Sama Alsayed M. Alkhedr", email: "sama.a@applab.qa", title: "UX Specialist" },
      { key: "kashfeen", name: "Syeda Kashfeen Zehra", email: "kashfeen.z@applab.qa", title: "UX Specialist" },
      { key: "aditya", name: "Aditya Sharma", email: "aditya.s@applab.qa", title: "UX Specialist" },
    ],
  },
  {
    key: "ishak", name: "Ishak Syed", email: "ishak@applab.qa", title: "Senior UI Designer",
    people: [
      { key: "asma", name: "Asma Belazi", email: "asma.b@applab.qa", title: "UI Designer" },
      { key: "hanan", name: "Hanan Moncy", email: "hanan.m@applab.qa", title: "UI Designer" },
      { key: "fawad", name: "Fawad Waheed", email: "fawad.w@applab.qa", title: "UI Designer" },
    ],
  },
  {
    key: "nanda", name: "Nandakumar Parapurath", email: "nanda@applab.qa", title: "Senior UI Designer",
    people: [{ key: "dilshikka", name: "S. Dilshikka", email: "dilshikka@applab.qa", title: "Associate UI Designer" }],
  },
  {
    key: "salman", name: "Salman Hameed", email: "salman.hameed@applab.qa", title: "Senior UI Designer",
    people: [
      { key: "justin", name: "Justin S John", email: "justin.j@applab.qa", title: "Associate UI Designer" },
      { key: "faiz", name: "Mohd Faiz Ahmad", email: "faiz.m@applab.qa", title: "UI Designer" },
      { key: "abdul", name: "Abdul Moiz", email: "abdul.m@applab.qa", title: "UI Designer" },
    ],
  },
  {
    key: "arun", name: "Arun Lal M K", email: "arun.l@applab.qa", title: "UI Designer",
    people: [
      { key: "akash", name: "Akash M", email: "akash.m@applab.qa", title: "Associate UI Designer" },
      { key: "amal", name: "Amal Davis", email: "amal.d@applab.qa", title: "Associate UI Designer" },
      { key: "arunr", name: "Arun Reji", email: "arun.r@applab.qa", title: "Associate UI Designer" },
    ],
  },
  {
    key: "hisham", name: "Hisham J Alturbaq", email: "hisham@applab.qa", title: "Senior UI Designer",
    people: [{ key: "shehab", name: "Shehab Beshr", email: "shehab.b@applab.qa", title: "UI Designer" }],
  },
  { key: "inshaf", name: "Mohamed Inshaf", email: "inshaf@applab.qa", title: "Senior UI Designer", people: [] },
  { key: "sumesh", name: "Sumesh Sugathan", email: "sumesh@applab.qa", title: "Senior UI Designer", people: [] },
];

// Starter skills by job title — the Design Head edits these per person.
function skillsFor(title: string): string[] {
  const t = title.toLowerCase();
  if (t.includes("head")) return ["Design Leadership", "Design Strategy", "Stakeholder Management"];
  if (t.includes("ux lead")) return ["UX Research", "Project Management", "Information Architecture", "Workshops"];
  if (t.includes("lead")) return ["UI Design", "Design Systems", "Art Direction", "Figma"];
  if (t.includes("ux")) return ["UX Research", "Wireframing", "Usability Testing", "Figma"];
  if (t.includes("senior")) return ["UI Design", "Design Systems", "Prototyping", "Figma"];
  return ["UI Design", "Figma", "Prototyping"];
}
const EXTRA_SKILLS = ["Mobile Apps", "Dashboards", "Arabic / RTL Layouts", "Illustration", "Motion Design", "Accessibility", "Web Design"];

// ─── Projects (sample) ────────────────────────────────────────────────────────
type ProjectSeed = {
  name: string;
  client: string;
  description: string;
  start: number;
  eta: number;
  priority: Priority;
  status: ProjectStatus;
  managers: string[];
  members: string[];
  /** Borrowed from other teams: person key → onboarding manager key */
  borrowed?: { key: string; by: string }[];
  stoppedAt?: number;
  figma?: { title: string; url: string; by: string }[];
};

const PROJECTS: ProjectSeed[] = [
  {
    name: "Corniche Mobility app", client: "Corniche Transit",
    description: "Journey planner and digital ticketing app for metro, tram and bus: trip search, wallet top-up, live arrivals and accessibility mode.",
    start: -40, eta: 20, priority: "HIGH", status: "IN_PROGRESS", managers: ["jinu", "arun"], members: ["ajay", "akash", "amal"],
    borrowed: [{ key: "asma", by: "jinu" }],
    figma: [
      { title: "Corniche Mobility — App UI", url: "https://www.figma.com/design/Ab12Cd34Ef56Gh78/Corniche-Mobility-App-UI", by: "arun" },
      { title: "Clickable prototype (v3)", url: "https://www.figma.com/proto/Ab12Cd34Ef56Gh78/Corniche-Mobility-Prototype", by: "akash" },
    ],
  },
  {
    name: "Pearl Utilities customer portal", client: "Pearl Utilities",
    description: "Self-service portal for bills, consumption insights, service requests and outage reporting, in Arabic and English.",
    start: -35, eta: 10, priority: "HIGH", status: "IN_PROGRESS", managers: ["sanya", "ishak"], members: ["rusna", "sama", "asma", "hanan"],
    figma: [{ title: "Portal — Wireframes & flows", url: "https://www.figma.com/design/Pq90Rs12Tu34Vw56/Pearl-Portal-Wireframes", by: "sanya" }],
  },
  {
    name: "Al Dafna Bank onboarding flow", client: "Al Dafna Bank",
    description: "Digital account opening with ID scan, video KYC and product selection. Currently with the client for compliance review.",
    start: -50, eta: -2, priority: "MEDIUM", status: "UNDER_REVIEW", managers: ["sanya"], members: ["kashfeen", "aditya"],
    figma: [{ title: "Onboarding — Hi-fi screens", url: "https://www.figma.com/design/Xy78Zz90Aa12Bb34/Al-Dafna-Onboarding", by: "kashfeen" }],
  },
  {
    name: "Doha Events ticketing website", client: "Doha Events",
    description: "Event discovery and ticketing website with seat maps, bundles and a responsive checkout.",
    start: -25, eta: 5, priority: "MEDIUM", status: "IN_PROGRESS", managers: ["salman"], members: ["justin", "faiz", "abdul"],
    borrowed: [{ key: "shehab", by: "salman" }],
  },
  {
    name: "Lusail Health analytics dashboard", client: "Lusail Health",
    description: "Operations dashboard for clinic capacity, wait times and patient flow, with drill-down by department.",
    start: -20, eta: 30, priority: "MEDIUM", status: "IN_PROGRESS", managers: ["nanda", "hisham"], members: ["dilshikka", "shehab"],
    figma: [{ title: "Dashboard — Components", url: "https://www.figma.com/design/Lh11Hh22Dd33Ss44/Lusail-Dashboard", by: "nanda" }],
  },
  {
    name: "Souq Retail design system", client: "Souq Retail",
    description: "Token-based design system for web and app: foundations, components and documentation site. Paused for budget sign-off.",
    start: -30, eta: 40, priority: "LOW", status: "ON_HOLD", stoppedAt: -12, managers: ["ishak"], members: ["fawad"],
  },
  {
    name: "Qatar Logistics fleet tracker", client: "Qatar Logistics",
    description: "Fleet tracking web app for dispatchers: live map, driver status, alerts and daily reports.",
    start: 4, eta: 50, priority: "MEDIUM", status: "NOT_STARTED", managers: ["arun"], members: ["arunr"],
  },
  {
    name: "Museum Quarter visitor app", client: "Museum Quarter",
    description: "Visitor app with indoor wayfinding, audio guides and exhibition calendar.",
    start: -15, eta: 25, priority: "HIGH", status: "IN_PROGRESS", managers: ["inshaf", "sumesh"], members: [],
    borrowed: [{ key: "aditya", by: "inshaf" }, { key: "dilshikka", by: "sumesh" }],
  },
  {
    name: "Westbay Realty website", client: "Westbay Realty",
    description: "Property listings website with search filters, project microsites and enquiry forms.",
    start: -70, eta: -20, priority: "MEDIUM", status: "COMPLETED", managers: ["salman"], members: ["justin", "abdul"],
  },
  {
    name: "Smart Parking kiosk UI", client: "City Parking Co.",
    description: "Touch-screen kiosk flow for payment and permit renewal. Cancelled after the client changed vendors.",
    start: -40, eta: 5, priority: "LOW", status: "CANCELLED", stoppedAt: -14, managers: ["hisham"], members: ["shehab"],
  },
  {
    name: "Marina Hotels booking revamp", client: "Marina Hotels",
    description: "Redesign of the booking engine: room selection, add-ons and loyalty sign-in.",
    start: -30, eta: 3, priority: "MEDIUM", status: "UNDER_REVIEW", managers: ["jinu"], members: ["ajay"],
  },
  {
    name: "Design ops toolkit", client: "Applab (internal)",
    description: "Shared templates, handover checklists and file conventions for the design department. Not yet assigned to a manager.",
    start: 7, eta: 60, priority: "LOW", status: "NOT_STARTED", managers: [], members: [],
  },
];

const STATUS_PATH: Record<ProjectStatus, ProjectStatus[]> = {
  NOT_STARTED: ["NOT_STARTED"],
  IN_PROGRESS: ["NOT_STARTED", "IN_PROGRESS"],
  ON_HOLD: ["NOT_STARTED", "IN_PROGRESS", "ON_HOLD"],
  UNDER_REVIEW: ["NOT_STARTED", "IN_PROGRESS", "UNDER_REVIEW"],
  COMPLETED: ["NOT_STARTED", "IN_PROGRESS", "UNDER_REVIEW", "COMPLETED"],
  CANCELLED: ["NOT_STARTED", "IN_PROGRESS", "CANCELLED"],
};

const TASKS: Record<TaskType, string[]> = {
  DESIGN: [
    "Designed the key screens in Figma",
    "Built component variants and auto-layout",
    "High-fidelity mockups for the next review",
    "Iconography and illustration spots",
    "Responsive layouts for tablet and mobile",
    "Arabic (RTL) versions of the main flows",
    "Prepared production-ready exports",
  ],
  REVISION: [
    "Applied client feedback from the last review",
    "Revised spacing and typography after internal crit",
    "Second round of revisions on the selected direction",
    "Fixed accessibility issues flagged in review",
  ],
  MEETING: ["Weekly client check-in", "Internal design crit", "Requirements walkthrough", "Handover call with development"],
  RESEARCH: ["Competitor scan", "Reviewed analytics and user feedback", "Moodboard and visual research", "Usability test with two users"],
  OTHER: ["File organisation and handover", "Prepared presentation deck", "QA pass on the staging build"],
};
const TASK_WEIGHTS: TaskType[] = ["DESIGN", "DESIGN", "DESIGN", "DESIGN", "REVISION", "REVISION", "MEETING", "RESEARCH", "OTHER"];
const QUESTIONS = [
  "Can you split this across the two screens you worked on?",
  "Was this for the Arabic version or the English one?",
  "This looks high for one revision round — anything blocking you?",
  "Which feedback round does this cover?",
  "Did this include the handover file prep?",
];
const ANSWERS = [
  "Mostly the English flow — I'll add a separate entry for RTL tomorrow.",
  "Yes, it included the export and the handover notes.",
  "The client sent a second batch of comments mid-day, so it took longer.",
  "Round 2 — I've added the details to the description.",
];

async function main() {
  console.log(`Seeding relative to ${todayIso} (${TZ})…`);

  await db.suggestionRead.deleteMany();
  await db.suggestionReply.deleteMany();
  await db.suggestion.deleteMany();
  await db.timeLogComment.deleteMany();
  await db.timeLog.deleteMany();
  await db.projectLink.deleteMany();
  await db.projectStatusChange.deleteMany();
  await db.projectAssignment.deleteMany();
  await db.projectManager.deleteMany();
  await db.project.deleteMany();
  await db.userSkill.deleteMany();
  await db.skill.deleteMany();
  await db.user.updateMany({ data: { managerId: null, availabilityOverrideById: null } });
  await db.user.deleteMany();

  const passwordHash = await bcrypt.hash(SEED_PASSWORD, 10);
  const roleFor = (title: string): Role => (title.toLowerCase().startsWith("associate") ? "ASSOCIATE_DESIGNER" : "MID_DESIGNER");

  const users = new Map<string, { id: string; name: string; role: Role; managerKey: string | null; title: string }>();
  const head = await db.user.create({ data: { name: HEAD.name, email: HEAD.email, role: "HEAD", jobTitle: HEAD.title, passwordHash } });
  users.set("prasun", { id: head.id, name: head.name, role: "HEAD", managerKey: null, title: HEAD.title });

  for (const team of TEAMS) {
    const m = await db.user.create({ data: { name: team.name, email: team.email.toLowerCase(), role: "MANAGER", jobTitle: team.title, passwordHash } });
    users.set(team.key, { id: m.id, name: m.name, role: "MANAGER", managerKey: null, title: team.title });
    for (const p of team.people) {
      const role = roleFor(p.title);
      const u = await db.user.create({ data: { name: p.name, email: p.email.toLowerCase(), role, jobTitle: p.title, managerId: m.id, passwordHash } });
      users.set(p.key, { id: u.id, name: u.name, role, managerKey: team.key, title: p.title });
    }
  }
  const U = (k: string) => users.get(k)!;

  // Skills
  const skillIds = new Map<string, string>();
  const skillId = async (name: string) => {
    if (!skillIds.has(name)) skillIds.set(name, (await db.skill.create({ data: { name } })).id);
    return skillIds.get(name)!;
  };
  for (const [, u] of users) {
    const names = new Set(skillsFor(u.title));
    if (u.role !== "HEAD") names.add(pick(EXTRA_SKILLS));
    for (const n of names) await db.userSkill.create({ data: { userId: u.id, skillId: await skillId(n) } });
  }

  // Availability: one person on leave (set by themselves), one set by their manager
  await db.user.update({ where: { id: U("hanan").id }, data: { availabilityOverride: "ON_LEAVE", availabilityOverrideAt: d(-1), availabilityOverrideById: U("hanan").id } });
  await db.user.update({ where: { id: U("amal").id }, data: { availabilityOverride: "PARTIALLY_AVAILABLE", availabilityOverrideAt: d(0), availabilityOverrideById: U("arun").id } });

  // Projects
  type Created = ProjectSeed & { id: string };
  const created: Created[] = [];
  for (const p of PROJECTS) {
    const createdAt = d(Math.min(p.start, 0) - 7);
    const project = await db.project.create({
      data: {
        name: p.name, client: p.client, description: p.description,
        startDate: d(p.start), eta: d(p.eta), priority: p.priority, status: p.status,
        createdById: head.id, createdAt,
        managers: { create: p.managers.map((k) => ({ managerId: U(k).id, assignedById: head.id, assignedAt: at(createdAt, 9) })) },
        assignments: {
          create: [
            ...p.members.map((k) => ({ userId: U(k).id, assignedById: U(U(k).managerKey!).id, assignedAt: at(createdAt, 11) })),
            ...(p.borrowed ?? []).map((b) => ({ userId: U(b.key).id, assignedById: U(b.by).id, assignedAt: at(createdAt, 12) })),
          ],
        },
        links: { create: (p.figma ?? []).map((l, i) => ({ title: l.title, url: l.url, addedById: U(l.by).id, createdAt: at(d(Math.min(p.start, 0) + 2 + i * 5), 12) })) },
      },
    });
    created.push({ ...p, id: project.id });

    const path = STATUS_PATH[p.status];
    const changer = p.managers[0] ? U(p.managers[0]).id : head.id;
    const start = Math.min(p.start, -1);
    const lastPoint = p.stoppedAt ?? (p.status === "COMPLETED" ? p.eta : p.status === "UNDER_REVIEW" ? -3 : -1);
    for (let i = 0; i < path.length; i++) {
      const offset = i === 0 ? null : i === 1 ? start : Math.max(Math.round(start + (lastPoint - start) * ((i - 1) / (path.length - 1))), start + 1);
      await db.projectStatusChange.create({
        data: {
          projectId: project.id,
          fromStatus: i === 0 ? null : path[i - 1],
          toStatus: path[i],
          changedById: i === 0 ? head.id : changer,
          changedAt: i === 0 ? at(createdAt, 9) : at(d(offset!), 10 + i),
        },
      });
    }
  }

  // ─── Time logs (last 3 weeks, Sun–Thu working days) ────────────────────────
  const workable = (p: Created, offset: number) => {
    if (p.status === "NOT_STARTED" || offset < p.start) return false;
    if (p.status === "COMPLETED" && offset > p.eta) return false;
    if (p.stoppedAt !== undefined && offset > p.stoppedAt) return false;
    return true;
  };
  type LogSeed = { userId: string; projectId: string; managerIds: string[]; date: Date; hours: number; description: string; taskType: TaskType; loggedById: string; createdAt: Date };
  const logs: LogSeed[] = [];
  for (const [key, person] of users) {
    if (person.role === "HEAD") continue;
    const theirs = created.filter((p) => p.members.includes(key) || p.managers.includes(key) || (p.borrowed ?? []).some((b) => b.key === key));
    const isLead = person.role === "MANAGER";
    for (let offset = -21; offset <= 0; offset++) {
      const date = d(offset);
      const wd = dow(date);
      if (wd === 5 || wd === 6) continue; // Fri–Sat weekend
      if (key === "hanan" && offset >= -1) continue; // on leave
      if (offset === 0 && rand() > 0.55) continue;
      if (rand() < 0.08) continue;
      const active = theirs.filter((p) => workable(p, offset));
      if (!active.length) continue;
      const dayTotal = offset === 0 ? halfHours(1.5, 4) : isLead ? halfHours(3, 6) : halfHours(5.5, 8);
      const split = active.length > 1 && rand() < 0.6 ? [active[0], pick(active.slice(1))] : [pick(active)];
      let remaining = dayTotal;
      split.forEach((project, i) => {
        const hours = i === split.length - 1 ? remaining : Math.max(0.5, Math.round(remaining * (0.4 + rand() * 0.3) * 2) / 2);
        remaining = Math.max(0, remaining - hours);
        if (hours <= 0) return;
        const taskType = pick(TASK_WEIGHTS);
        // ~10% of designer entries are logged by their manager on their behalf
        const byManager = !isLead && rand() < 0.1 && project.managers.includes(person.managerKey!);
        logs.push({
          userId: person.id,
          projectId: project.id,
          managerIds: project.managers.map((m) => U(m).id),
          date,
          hours,
          description: `${pick(TASKS[taskType])}${taskType === "MEETING" ? ` (${project.client})` : ""}`,
          taskType,
          loggedById: byManager ? U(person.managerKey!).id : person.id,
          createdAt: at(date, 17 + rand() * 2),
        });
      });
    }
  }
  const createdLogs: (LogSeed & { id: string })[] = [];
  for (const { managerIds, ...l } of logs) {
    const row = await db.timeLog.create({ data: l });
    createdLogs.push({ ...l, managerIds, id: row.id });
  }

  // ─── Comment threads on entries ─────────────────────────────────────────────
  const designerLogs = createdLogs.filter((l) => l.managerIds.length && !l.managerIds.includes(l.userId) && l.date >= d(-10));
  const chosen = designerLogs.filter((_, i) => i % 9 === 3).slice(0, 12);
  for (const [i, l] of chosen.entries()) {
    const person = [...users.values()].find((u) => u.id === l.userId)!;
    const askerId = person.managerKey && l.managerIds.includes(U(person.managerKey).id) ? U(person.managerKey).id : l.managerIds[0];
    const asked = at(l.date, 24 + 10);
    await db.timeLogComment.create({ data: { timeLogId: l.id, authorId: askerId, message: pick(QUESTIONS), createdAt: asked } });
    if (i % 3 !== 0) {
      await db.timeLogComment.create({ data: { timeLogId: l.id, authorId: l.userId, message: pick(ANSWERS), createdAt: at(asked, 2) } });
      if (i % 3 === 2) await db.timeLogComment.create({ data: { timeLogId: l.id, authorId: askerId, message: "Thanks, that's clear.", createdAt: at(asked, 4) } });
    }
  }

  // ─── Suggestions ───────────────────────────────────────────────────────────
  type SuggestionSeed = {
    author: string; title: string; category: "PROCESS" | "TOOLS" | "WORKLOAD" | "OTHER"; message: string; anonymous?: boolean;
    status: "NEW" | "UNDER_CONSIDERATION" | "IMPLEMENTED" | "DECLINED"; daysAgo: number;
    replies: { by: "head" | "author"; text: string; daysAgo: number }[]; headRead?: boolean; authorReadAll?: boolean;
  };
  const SUGGESTIONS: SuggestionSeed[] = [
    {
      author: "ishak", title: "One shared Figma component library for all teams", category: "TOOLS", status: "UNDER_CONSIDERATION", daysAgo: 12,
      message: "Each team keeps its own buttons, forms and cards, and they drift apart. A single shared library with an owner per component family would save rework when projects are shared between teams.",
      replies: [
        { by: "head", text: "Agree. Can you estimate how many hours a quarter the duplication costs your team?", daysAgo: 10 },
        { by: "author", text: "Roughly 20 hours a quarter for us, mostly rebuilding components on shared projects.", daysAgo: 9 },
        { by: "head", text: "Thanks — adding it to next quarter's plan. Let's pick owners at the leads' sync.", daysAgo: 2 },
      ],
      headRead: true,
    },
    {
      author: "sanya", title: "Protect focus time: no meetings on Wednesday mornings", category: "WORKLOAD", status: "NEW", daysAgo: 1, anonymous: true,
      message: "Designers are averaging four meetings a day in delivery weeks. A protected half-day would help us hit ETAs without overtime.",
      replies: [],
    },
    {
      author: "salman", title: "Cap client feedback at two rounds per milestone", category: "PROCESS", status: "IMPLEMENTED", daysAgo: 30,
      message: "Open-ended revision rounds are the main reason website projects slip. Proposal: two included rounds per milestone, extra rounds scoped as change requests.",
      replies: [
        { by: "head", text: "Approved. The proposal template is updated for all new projects from this month.", daysAgo: 21 },
        { by: "author", text: "Great, thank you. I'll brief the team.", daysAgo: 20 },
      ],
      headRead: true, authorReadAll: true,
    },
    {
      author: "arun", title: "Handover checklist for development", category: "PROCESS", status: "NEW", daysAgo: 3,
      message: "Handover quality varies between teams. A shared checklist (specs, states, RTL, assets, prototype links) would cut back-and-forth with developers.",
      replies: [],
    },
    {
      author: "hisham", title: "Usability testing budget", category: "TOOLS", status: "DECLINED", daysAgo: 25,
      message: "A small monthly budget for remote usability testing would let us validate flows before client reviews.",
      replies: [
        { by: "head", text: "Not possible this financial year. Let's run guerrilla tests in-house for now and revisit in Q1.", daysAgo: 22 },
      ],
      headRead: true, authorReadAll: true,
    },
  ];
  for (const s of SUGGESTIONS) {
    const authorId = U(s.author).id;
    const createdAt = at(d(-s.daysAgo), 11);
    const replies = s.replies.map((r) => ({ authorId: r.by === "head" ? head.id : authorId, message: r.text, createdAt: at(d(-r.daysAgo), 15) }));
    const lastActivityAt = replies.length ? replies[replies.length - 1].createdAt : createdAt;
    const sug = await db.suggestion.create({
      data: { authorId, title: s.title, category: s.category, message: s.message, anonymous: !!s.anonymous, status: s.status, createdAt, lastActivityAt, replies: { create: replies } },
    });
    const authorMsgs = [createdAt, ...replies.filter((r) => r.authorId === authorId).map((r) => r.createdAt)];
    await db.suggestionRead.create({ data: { userId: authorId, suggestionId: sug.id, lastReadAt: s.authorReadAll ? lastActivityAt : authorMsgs[authorMsgs.length - 1] } });
    if (s.headRead) {
      const headMsgs = replies.filter((r) => r.authorId === head.id).map((r) => r.createdAt);
      await db.suggestionRead.create({ data: { userId: head.id, suggestionId: sug.id, lastReadAt: headMsgs.at(-1) ?? lastActivityAt } });
    }
  }

  // Project requests from Design Managers: one waiting for the Head, one declined.
  const requests = [
    {
      by: "sanya", name: "Loyalty App Discovery", client: "Applab Internal", priority: "MEDIUM" as Priority, daysAgo: 1, approval: "PENDING" as const, note: null,
      description: "Two-week discovery for a loyalty programme app: stakeholder interviews, competitor review and a first journey map.",
    },
    {
      by: "arun", name: "Annual Report Microsite", client: "Applab Marketing", priority: "LOW" as Priority, daysAgo: 6, approval: "REJECTED" as const,
      note: "Marketing hasn't confirmed the budget yet. Add the agreed scope and resubmit once they sign off.",
      description: "Interactive microsite for the annual report with animated data stories.",
    },
  ];
  for (const r of requests) {
    const submittedAt = at(d(-r.daysAgo), 10);
    const p = await db.project.create({
      data: {
        name: r.name, client: r.client, description: r.description, priority: r.priority, status: "NOT_STARTED",
        startDate: d(7), eta: d(40), createdById: U(r.by).id, createdAt: submittedAt, submittedAt,
        approval: r.approval, approvalNote: r.note,
        ...(r.approval === "REJECTED" ? { reviewedById: head.id, reviewedAt: at(d(-r.daysAgo + 1), 9) } : {}),
        statusChanges: { create: { fromStatus: null, toStatus: "NOT_STARTED", changedById: U(r.by).id, changedAt: submittedAt } },
        managers: { create: { managerId: U(r.by).id, assignedById: U(r.by).id, assignedAt: submittedAt } },
      },
    });
    if (r.approval === "PENDING") {
      await db.notification.create({
        data: { userId: head.id, actorId: U(r.by).id, type: "project_request", title: "New project request", body: `${U(r.by).name} requested “${r.name}” for ${r.client}. Review it to approve or decline.`, link: `/projects/${p.id}`, createdAt: submittedAt },
      });
    } else {
      await db.notification.create({
        data: { userId: U(r.by).id, actorId: head.id, type: "project_rejected", title: "Project request declined", body: `${head.name} declined “${r.name}”: ${r.note} Edit the project to resubmit it.`, link: `/projects/${p.id}`, createdAt: at(d(-r.daysAgo + 1), 9) },
      });
    }
  }

  console.log("Seeded:", {
    users: await db.user.count(),
    projects: await db.project.count(),
    timeLogs: await db.timeLog.count(),
    comments: await db.timeLogComment.count(),
    skills: await db.skill.count(),
    suggestions: await db.suggestion.count(),
  });
  console.log(`All accounts use the password: ${SEED_PASSWORD}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
