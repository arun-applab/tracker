import { notFound } from "next/navigation";
import { PageHeader } from "@/components/app/page-header";
import { ProjectForm } from "@/components/app/project-form";
import { db } from "@/lib/db";
import { toIso } from "@/lib/dates";
import { requireActor } from "@/server/actor";
import { listAssignableManagers } from "@/server/services/projects";

export const metadata = { title: "Edit project" };

export default async function EditProjectPage({ params }: { params: Promise<{ id: string }> }) {
  await requireActor(["HEAD"]);
  const { id } = await params;
  const [project, managers] = await Promise.all([
    db.project.findUnique({ where: { id }, include: { managers: { select: { managerId: true } } } }),
    listAssignableManagers(),
  ]);
  if (!project) notFound();
  return (
    <>
      <PageHeader title={`Edit ${project.name}`} description="Status changes are recorded in the project's history." />
      <ProjectForm
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
