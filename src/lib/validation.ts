import { z } from "zod";
import {
  AVAILABILITY_STATUSES,
  PRIORITIES,
  PROJECT_STATUSES,
  SUGGESTION_CATEGORIES,
  SUGGESTION_STATUSES,
  TASK_TYPES,
} from "@/lib/constants";
import { isValidIso } from "@/lib/dates";

const isoDate = z.string().refine(isValidIso, "Use a valid date (YYYY-MM-DD)");
const id = z.string().min(1);
const text = (max: number, label: string) => z.string().trim().min(1, `${label} is required`).max(max, `${label} is too long`);

export const projectInput = z
  .object({
    name: text(120, "Name"),
    client: text(120, "Client"),
    description: z.string().trim().max(4000).default(""),
    startDate: isoDate,
    eta: isoDate,
    priority: z.enum(PRIORITIES),
    status: z.enum(PROJECT_STATUSES).optional(),
    managerIds: z.array(id).default([]),
  })
  .refine((v) => v.eta >= v.startDate, { message: "ETA can't be before the start date", path: ["eta"] });

export const statusInput = z.object({ status: z.enum(PROJECT_STATUSES) });
export const membersInput = z.object({ memberIds: z.array(id) });

export const hoursSchema = z
  .number()
  .positive("Hours must be more than 0")
  .max(12, "No more than 12 hours in one entry")
  .refine((h) => Number.isInteger(h * 2), "Hours must be in 0.5 steps");

export const timeLogInput = z.object({
  userId: id.optional(), // omitted = yourself
  projectId: id,
  date: isoDate,
  hours: hoursSchema,
  description: text(1000, "Task description"),
  taskType: z.enum(TASK_TYPES),
  overrideBackdate: z.boolean().optional(),
});

export const timeLogUpdate = timeLogInput.omit({ userId: true });

export const commentInput = z.object({ message: text(2000, "Comment") });

export const linkInput = z.object({
  title: z.string().trim().max(120).optional(),
  url: z
    .url("Enter a valid link")
    .refine((u) => {
      try {
        const h = new URL(u).hostname.toLowerCase();
        return h === "figma.com" || h.endsWith(".figma.com");
      } catch {
        return false;
      }
    }, "Only figma.com links can be added"),
});

export const skillsInput = z.object({ skills: z.array(z.string().trim().min(1).max(40)).max(30) });

export const logFilters = z.object({
  from: isoDate.optional(),
  to: isoDate.optional(),
  projectId: id.optional(),
  userId: id.optional(),
  role: z.enum(["MANAGER", "ASSOCIATE_DESIGNER", "MID_DESIGNER"]).optional(),
});

const password = z.string().min(8, "Password must be at least 8 characters").max(100);

export const userCreate = z.object({
  name: text(100, "Name"),
  email: z.email("Enter a valid email").transform((e) => e.toLowerCase()),
  password,
  role: z.enum(["HEAD", "MANAGER", "ASSOCIATE_DESIGNER", "MID_DESIGNER"]),
  jobTitle: z.string().trim().max(80).optional().nullable(),
  managerId: id.optional().nullable(),
});

export const userUpdate = z.object({
  name: text(100, "Name").optional(),
  email: z.email("Enter a valid email").transform((e) => e.toLowerCase()).optional(),
  password: password.optional().or(z.literal("").transform(() => undefined)),
  role: z.enum(["HEAD", "MANAGER", "ASSOCIATE_DESIGNER", "MID_DESIGNER"]).optional(),
  jobTitle: z.string().trim().max(80).optional().nullable(),
  managerId: id.optional().nullable(),
  isActive: z.boolean().optional(),
});

export const availabilityInput = z.object({ override: z.enum(AVAILABILITY_STATUSES).nullable() });

export const suggestionInput = z.object({
  title: text(140, "Title"),
  category: z.enum(SUGGESTION_CATEGORIES),
  message: text(4000, "Message"),
  anonymous: z.boolean().default(false),
});

export const replyInput = z.object({ message: text(4000, "Reply") });
export const suggestionStatusInput = z.object({ status: z.enum(SUGGESTION_STATUSES) });

export const passwordChangeInput = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password"),
    newPassword: password,
  })
  .refine((v) => v.newPassword !== v.currentPassword, { message: "Pick a password different from the current one", path: ["newPassword"] });

export const notificationReadInput = z.union([z.object({ all: z.literal(true) }), z.object({ ids: z.array(id).min(1).max(200) })]);

export const pushSubscriptionInput = z.object({
  endpoint: z.url().max(2000),
  keys: z.object({ p256dh: z.string().min(1).max(500), auth: z.string().min(1).max(500) }),
});
export const pushUnsubscribeInput = z.object({ endpoint: z.string().max(2000) });

export const projectReviewInput = z
  .object({ decision: z.enum(["APPROVE", "REJECT"]), note: z.string().trim().max(1000).optional() })
  .refine((v) => v.decision === "APPROVE" || !!v.note, { message: "Add a reason so the manager knows what to change", path: ["note"] });
