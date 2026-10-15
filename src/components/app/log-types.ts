import type { Role, TaskType } from "@/lib/constants";

export type LogRow = {
  id: string;
  date: string;
  hours: number;
  description: string;
  taskType: TaskType;
  user: { id: string; name: string; role: Role };
  project: { id: string; name: string };
  loggedBy: { id: string; name: string };
  loggedBySelf: boolean;
  commentCount: number;
  /** Someone else wrote the latest comment on a thread the viewer is part of. */
  awaitingMe: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canComment: boolean;
};

/** Options for the time-entry dialog. */
export type LogFormOptions =
  | { mode: "self"; projects: { id: string; name: string }[]; today: string; minDate: string }
  | {
      mode: "manager";
      /** Projects the manager can log their own time on. */
      ownProjects: { id: string; name: string }[];
      /** Projects they manage, with the own-team people they can log for. */
      projects: { id: string; name: string; closed: boolean; people: { id: string; name: string }[] }[];
      today: string;
      minDate: string;
    };

export type Thread = {
  id: string;
  date: string;
  hours: number;
  description: string;
  taskType: TaskType;
  user: { id: string; name: string };
  project: { id: string; name: string };
  loggedBy: string;
  canComment: boolean;
  comments: { id: string; message: string; createdAt: string; mine: boolean; author: { id: string; name: string; role: Role } }[];
};
