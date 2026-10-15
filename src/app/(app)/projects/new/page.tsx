import { PageHeader } from "@/components/app/page-header";
import { ProjectForm } from "@/components/app/project-form";
import { addDays } from "@/lib/dates";
import { todayIso } from "@/lib/server-time";
import { requireActor } from "@/server/actor";
import { listAssignableManagers } from "@/server/services/projects";

export const metadata = { title: "New project" };

export default async function NewProjectPage() {
  await requireActor(["HEAD"]);
  const managers = await listAssignableManagers();
  const today = todayIso();
  return (
    <>
      <PageHeader title="New project" description="Create the project and assign it to one or more Design Managers." />
      <ProjectForm
        managers={managers.map((m) => ({ id: m.id, name: m.name, jobTitle: m.jobTitle, teamSize: m._count.reports }))}
        initial={{ name: "", client: "", description: "", startDate: today, eta: addDays(today, 30), priority: "MEDIUM", status: "NOT_STARTED", managerIds: [] }}
      />
    </>
  );
}
