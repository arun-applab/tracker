import "server-only";
import { cache } from "react";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { unauthorized } from "@/lib/errors";
import type { Role } from "@/generated/prisma/enums";

export type Actor = {
  id: string;
  name: string;
  email: string;
  role: Role;
  managerId: string | null;
};

/**
 * The signed-in user, re-read from the database on every request so that
 * role changes and deactivations take effect immediately.
 */
export const getActor = cache(async (): Promise<Actor | null> => {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, email: true, role: true, managerId: true, isActive: true },
  });
  if (!user || !user.isActive) return null;
  return { id: user.id, name: user.name, email: user.email, role: user.role, managerId: user.managerId };
});

/** For pages: redirect to login when signed out, optionally restrict roles. */
export async function requireActor(roles?: Role[]): Promise<Actor> {
  const actor = await getActor();
  if (!actor) redirect("/login");
  if (roles && !roles.includes(actor.role)) redirect("/");
  return actor;
}

/** For API routes: throw 401 when signed out. */
export async function apiActor(): Promise<Actor> {
  const actor = await getActor();
  if (!actor) throw unauthorized();
  return actor;
}
