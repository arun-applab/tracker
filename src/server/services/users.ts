import "server-only";
import bcrypt from "bcryptjs";
import type { z } from "zod";
import { db } from "@/lib/db";
import { badRequest, forbidden, notFound } from "@/lib/errors";
import type { Prisma } from "@/generated/prisma/client";
import type { Actor } from "@/server/actor";
import { canManageSkills, canManageUser, isDesignerRole, isHead, isManager } from "@/server/permissions";
import type { userCreate, userUpdate } from "@/lib/validation";

export const userListSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  jobTitle: true,
  isActive: true,
  managerId: true,
  manager: { select: { id: true, name: true } },
  skills: { select: { skill: { select: { name: true } } }, orderBy: { skill: { name: "asc" } } },
  createdAt: true,
} satisfies Prisma.UserSelect;

/** Head: everyone. Manager: their own team. */
export async function listUsers(actor: Actor) {
  if (isHead(actor)) {
    return db.user.findMany({ select: userListSelect, orderBy: [{ role: "asc" }, { name: "asc" }] });
  }
  if (isManager(actor)) {
    return db.user.findMany({ where: { managerId: actor.id }, select: userListSelect, orderBy: [{ role: "asc" }, { name: "asc" }] });
  }
  throw forbidden();
}

export async function listManagers() {
  return db.user.findMany({ where: { role: "MANAGER", isActive: true }, select: { id: true, name: true }, orderBy: { name: "asc" } });
}

async function assertValidManager(managerId: string | null | undefined) {
  if (!managerId) throw badRequest("Associate Designers and Team Members must report to a Design Manager.");
  const m = await db.user.findUnique({ where: { id: managerId }, select: { role: true, isActive: true } });
  if (!m || m.role !== "MANAGER" || !m.isActive) throw badRequest("Pick an active Design Manager.");
}

async function assertEmailFree(email: string, exceptId?: string) {
  const existing = await db.user.findUnique({ where: { email }, select: { id: true } });
  if (existing && existing.id !== exceptId) throw badRequest("That email is already in use.");
}

export async function createUser(actor: Actor, input: z.infer<typeof userCreate>) {
  const { role } = input;
  let { managerId } = input;
  if (isManager(actor)) {
    // Managers add designers into their own team only.
    if (!isDesignerRole(role)) throw forbidden("Design Managers can add Associate Designers and Team Members only.");
    managerId = actor.id;
  } else if (!isHead(actor)) {
    throw forbidden();
  }
  if (isDesignerRole(role)) await assertValidManager(managerId);
  else managerId = null;
  if (role === "HEAD" && (await db.user.count({ where: { role: "HEAD", isActive: true } })) > 0) {
    throw badRequest("There is already a Design Head.");
  }
  await assertEmailFree(input.email);
  const user = await db.user.create({
    data: {
      name: input.name,
      email: input.email,
      passwordHash: await bcrypt.hash(input.password, 10),
      role,
      jobTitle: input.jobTitle || null,
      managerId,
    },
    select: { id: true },
  });
  return user;
}

export async function updateUser(actor: Actor, id: string, input: z.infer<typeof userUpdate>) {
  const target = await db.user.findUnique({ where: { id } });
  if (!target) throw notFound("User not found");
  if (!canManageUser(actor, target)) throw forbidden("You can only manage people in your own team.");

  const data: Prisma.UserUncheckedUpdateInput = {};
  if (input.name !== undefined) data.name = input.name;
  if (input.email !== undefined && input.email !== target.email) {
    await assertEmailFree(input.email, id);
    data.email = input.email;
  }
  if (input.jobTitle !== undefined) data.jobTitle = input.jobTitle || null;

  if (isHead(actor)) {
    const self = actor.id === id;
    if (self && (input.isActive === false || (input.role && input.role !== "HEAD"))) {
      throw badRequest("You can't deactivate yourself or change your own role.");
    }
    const role = input.role ?? target.role;
    if (role === "HEAD" && target.role !== "HEAD") throw badRequest("There can only be one Design Head.");
    if (target.role === "MANAGER" && role !== "MANAGER") {
      const reports = await db.user.count({ where: { managerId: id, isActive: true } });
      if (reports) throw badRequest("Move this manager's team to another manager before changing their role.");
    }
    if (input.role !== undefined) data.role = role;
    if (isDesignerRole(role)) {
      const managerId = input.managerId !== undefined ? input.managerId : target.managerId;
      await assertValidManager(managerId);
      data.managerId = managerId;
    } else {
      data.managerId = null;
    }
    if (input.isActive !== undefined) {
      if (input.isActive === false && target.role === "MANAGER") {
        const reports = await db.user.count({ where: { managerId: id, isActive: true } });
        if (reports) throw badRequest("Move this manager's team to another manager before deactivating them.");
      }
      data.isActive = input.isActive;
    }
    if (input.password) data.passwordHash = await bcrypt.hash(input.password, 10);
  } else {
    // Manager editing their own team member: name, email, title, AD ↔ TM role.
    if (input.role !== undefined) {
      if (!isDesignerRole(input.role)) throw forbidden("Design Managers can only switch between Associate Designer and Team Member.");
      data.role = input.role;
    }
    if (input.managerId !== undefined && input.managerId !== actor.id) throw forbidden("Only the Design Head can move people between teams.");
    if (input.isActive !== undefined) throw forbidden("Only the Design Head can deactivate accounts.");
    if (input.password) throw forbidden("Only the Design Head can reset passwords.");
  }

  await db.user.update({ where: { id }, data });
  return { id };
}

// ─── Skills (managed by the Design Head) ────────────────────────────────────

export async function listSkills() {
  const skills = await db.skill.findMany({ select: { name: true, _count: { select: { users: true } } }, orderBy: { name: "asc" } });
  return skills.map((s) => ({ name: s.name, count: s._count.users }));
}

/** Replaces a person's skills. New skill names are created on the fly (case-insensitive match). */
export async function setUserSkills(actor: Actor, userId: string, names: string[]) {
  if (!canManageSkills(actor)) throw forbidden("Only the Design Head can manage skills.");
  const user = await db.user.findUnique({ where: { id: userId }, select: { id: true } });
  if (!user) throw notFound("User not found");
  const existing = await db.skill.findMany({ select: { id: true, name: true } });
  const wanted = new Map<string, string>(); // lowercase → display
  for (const n of names.map((n) => n.trim().replace(/\s+/g, " ")).filter(Boolean)) {
    if (!wanted.has(n.toLowerCase())) wanted.set(n.toLowerCase(), n);
  }
  await db.$transaction(async (tx) => {
    const ids: string[] = [];
    for (const [key, display] of wanted) {
      const match = existing.find((s) => s.name.toLowerCase() === key);
      ids.push(match ? match.id : (await tx.skill.create({ data: { name: display } })).id);
    }
    await tx.userSkill.deleteMany({ where: { userId } });
    for (const skillId of ids) await tx.userSkill.create({ data: { userId, skillId } });
  });
  return { id: userId, count: wanted.size };
}
