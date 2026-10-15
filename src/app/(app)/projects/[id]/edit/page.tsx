import { notFound } from "next/navigation";
import { PageHeader } from "@/components/app/page-header";
import { ProjectForm } from "@/components/app/project-form";
import { db } from "@/lib/db";
import { toIso } from "@/lib/dates";
import { requireActor } from "@/server/actor";
import { canEditProjectDetails, gateOf } from "@/server/permissions";
import { listAssignableManagers } from "@/server/services/projects";

export const metadata = { title: "Edit project" };

export default async function EditProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requireActor(["HEAD", "MANAGER"]);
  const { id } = await params;
  const [project, managers] = await Promise.all([
    db.project.findUnique({ where: { id }, include: { managers: { select: { managerId: true } }, assignments: { select: { userId: true } } } }),
    listAssignableManagers(),
  ]);
  if (!project || !canEditProjectDetails(actor, gateOf(project))) notFound();
  const request = actor.role === "MANAGER" && project.approval !== "APPROVED" ? { selfId: actor.id, approval: project.approval as "PENDING" | "REJECTED" } : undefined;
  return (
    <>
      <PageHeader
        title={`Edit ${project.name}`}
        description={
          request?.approval === "REJECTED"
            ? `Declined by the Design Head${project.approvalNote ? `: “${project.approvalNote}”` : ""}. Update it and resubmit.`
            : request
              ? "Waiting for the Design Head's approval. You can still make changes."
              : "Status changes are recorded in the project's history."
        }
      />
      <ProjectForm
        request={request}
        projectId={project.id}
        managers={managers.map((m) => ({ id: m.id, name: m.name, jobTitle: m.jobTitle, teamSize: m._count.reports }))}
        initial={{
          name: project.name,
          client: project.client,
          description: project.description,
          startDate: toIso(project.startDate),
          eta: toIso(project.eta),
          priority: project.priority,
          status: project.status,
          managerIds: project.managers.map((m) => m.managerId),
        }}
      />
    </>
  );
}
