import { PageHeader } from "@/components/app/page-header";
import { ProjectForm } from "@/components/app/project-form";
import { addDays } from "@/lib/dates";
import { todayIso } from "@/lib/server-time";
import { requireActor } from "@/server/actor";
import { listAssignableManagers } from "@/server/services/projects";

export const metadata = { title: "New project" };

export default async function NewProjectPage() {
  const actor = await requireActor(["HEAD", "MANAGER"]);
  const managers = await listAssignableManagers();
  const today = todayIso();
  const request = actor.role === "MANAGER";
  return (
    <>
      <PageHeader
        title={request ? "Request a project" : "New project"}
        description={request ? "Your project goes to the Design Head for approval before the team can start." : "Create the project and assign it to one or more Design Managers."}
      />
      <ProjectForm
        request={request ? { selfId: actor.id } : undefined}
        managers={managers.map((m) => ({ id: m.id, name: m.name, jobTitle: m.jobTitle, teamSize: m._count.reports }))}
        initial={{ name: "", client: "", description: "", startDate: today, eta: addDays(today, 30), priority: "MEDIUM", status: "NOT_STARTED", managerIds: request ? [actor.id] : [] }}
      />
    </>
  );
}
