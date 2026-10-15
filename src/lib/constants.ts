// Labels and colors shared by the whole app. Safe for client and server.
// Every status badge / chart reads its colors from here so they stay consistent.

import type {
  AvailabilityStatus,
  Priority,
  ProjectApproval,
  ProjectStatus,
  Role,
  SuggestionCategory,
  SuggestionStatus,
  TaskType,
} from "@/generated/prisma/enums";

export type { AvailabilityStatus, Priority, ProjectApproval, ProjectStatus, Role, SuggestionCategory, SuggestionStatus, TaskType };

type Meta = { label: string; badge: string; dot: string; hex: string };

export const ROLE_LABEL: Record<Role, string> = {
  HEAD: "Design Head",
  MANAGER: "Design Manager",
  ASSOCIATE_DESIGNER: "Associate Designer",
  MID_DESIGNER: "Mid Designer",
};

export const DESIGNER_ROLES = ["MID_DESIGNER", "ASSOCIATE_DESIGNER"] as const satisfies readonly Role[];

/** Approval of projects requested by Design Managers. */
export const PROJECT_APPROVAL: Record<ProjectApproval, Meta> = {
  PENDING: { label: "Awaiting approval", badge: "bg-amber-100 text-amber-900 ring-amber-200", dot: "bg-amber-400", hex: "#d97706" },
  APPROVED: { label: "Approved", badge: "bg-[#dcf2e8] text-[#1f7a52] ring-transparent", dot: "bg-[#4fb38a]", hex: "#2f9a6e" },
  REJECTED: { label: "Declined", badge: "bg-[#fde2e1] text-[#b23b3b] ring-transparent", dot: "bg-[#e26d6d]", hex: "#d64545" },
};

export const PROJECT_STATUSES = [
  "NOT_STARTED",
  "IN_PROGRESS",
  "ON_HOLD",
  "UNDER_REVIEW",
  "COMPLETED",
  "CANCELLED",
] as const satisfies readonly ProjectStatus[];

export const PROJECT_STATUS: Record<ProjectStatus, Meta> = {
  NOT_STARTED: { label: "Not Started", badge: "bg-slate-400 text-white ring-transparent", dot: "bg-slate-400", hex: "#64748b" },
  IN_PROGRESS: { label: "In Progress", badge: "bg-[#6f8ff0] text-white ring-transparent", dot: "bg-[#6f8ff0]", hex: "#4f72e3" },
  ON_HOLD: { label: "On Hold", badge: "bg-amber-400 text-amber-950 ring-transparent", dot: "bg-amber-400", hex: "#d97706" },
  UNDER_REVIEW: { label: "Under Review", badge: "bg-[#a48ae8] text-white ring-transparent", dot: "bg-[#a48ae8]", hex: "#7c5ad8" },
  COMPLETED: { label: "Completed", badge: "bg-[#4fb38a] text-white ring-transparent", dot: "bg-[#4fb38a]", hex: "#2f9a6e" },
  CANCELLED: { label: "Cancelled", badge: "bg-zinc-200 text-zinc-600 ring-transparent", dot: "bg-zinc-400", hex: "#a1a1aa" },
};

/** Projects that still count as "active" work. */
export const ACTIVE_PROJECT_STATUSES: ProjectStatus[] = ["NOT_STARTED", "IN_PROGRESS", "ON_HOLD", "UNDER_REVIEW"];
/** Assignments on these statuses make a person Occupied. */
export const OCCUPYING_STATUSES: ProjectStatus[] = ["IN_PROGRESS", "UNDER_REVIEW"];
/** Nobody can self-log onto these. */
export const CLOSED_PROJECT_STATUSES: ProjectStatus[] = ["COMPLETED", "CANCELLED"];

export const PRIORITIES = ["LOW", "MEDIUM", "HIGH"] as const satisfies readonly Priority[];
export const PRIORITY: Record<Priority, Meta> = {
  LOW: { label: "Low", badge: "bg-white/80 text-slate-600 ring-black/[0.06]", dot: "bg-slate-400", hex: "#94a3b8" },
  MEDIUM: { label: "Medium", badge: "bg-white/80 text-[#3550b8] ring-black/[0.06]", dot: "bg-sky-500", hex: "#0ea5e9" },
  HIGH: { label: "High", badge: "bg-[#fde2e1] text-[#b23b3b] ring-transparent", dot: "bg-orange-500", hex: "#f97316" },
};

export const TASK_TYPES = ["DESIGN", "REVISION", "MEETING", "RESEARCH", "OTHER"] as const satisfies readonly TaskType[];
export const TASK_TYPE_LABEL: Record<TaskType, string> = {
  DESIGN: "Design",
  REVISION: "Revision",
  MEETING: "Meeting",
  RESEARCH: "Research",
  OTHER: "Other",
};

export const AVAILABILITY_STATUSES = ["AVAILABLE", "PARTIALLY_AVAILABLE", "OCCUPIED", "ON_LEAVE"] as const satisfies readonly AvailabilityStatus[];
export const AVAILABILITY: Record<AvailabilityStatus, Meta> = {
  AVAILABLE: { label: "Available", badge: "bg-[#4fb38a] text-white ring-transparent", dot: "bg-[#4fb38a]", hex: "#2f9a6e" },
  PARTIALLY_AVAILABLE: { label: "Partially Available", badge: "bg-amber-400 text-amber-950 ring-transparent", dot: "bg-amber-400", hex: "#d97706" },
  OCCUPIED: { label: "Occupied", badge: "bg-[#e26d6d] text-white ring-transparent", dot: "bg-[#e26d6d]", hex: "#d64545" },
  ON_LEAVE: { label: "On Leave", badge: "bg-slate-400 text-white ring-transparent", dot: "bg-slate-400", hex: "#64748b" },
};

export const SUGGESTION_CATEGORIES = ["PROCESS", "TOOLS", "WORKLOAD", "OTHER"] as const satisfies readonly SuggestionCategory[];
export const SUGGESTION_CATEGORY_LABEL: Record<SuggestionCategory, string> = {
  PROCESS: "Process",
  TOOLS: "Tools",
  WORKLOAD: "Workload",
  OTHER: "Other",
};

export const SUGGESTION_STATUSES = ["NEW", "UNDER_CONSIDERATION", "IMPLEMENTED", "DECLINED"] as const satisfies readonly SuggestionStatus[];
export const SUGGESTION_STATUS: Record<SuggestionStatus, Meta> = {
  NEW: { label: "New", badge: "bg-[#6f8ff0] text-white ring-transparent", dot: "bg-[#6f8ff0]", hex: "#4f72e3" },
  UNDER_CONSIDERATION: { label: "Under Consideration", badge: "bg-[#a48ae8] text-white ring-transparent", dot: "bg-[#a48ae8]", hex: "#7c5ad8" },
  IMPLEMENTED: { label: "Implemented", badge: "bg-[#4fb38a] text-white ring-transparent", dot: "bg-[#4fb38a]", hex: "#2f9a6e" },
  DECLINED: { label: "Declined", badge: "bg-zinc-200 text-zinc-600 ring-transparent", dot: "bg-zinc-400", hex: "#a1a1aa" },
};

export const MAX_HOURS_PER_DAY = 12;
/** How far back people can log time, and how long they can edit/delete their own entries. */
export const BACKDATE_LIMIT_DAYS = 7;
