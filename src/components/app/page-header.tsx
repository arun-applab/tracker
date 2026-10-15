export function PageHeader({ title, description, actions, children }: { title: React.ReactNode; description?: React.ReactNode; actions?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0 space-y-1.5">
        <h1 className="text-[28px] font-semibold leading-tight tracking-tight sm:text-[34px]">{title}</h1>
        {description && <div className="text-[15px] text-muted-foreground">{description}</div>}
        {children}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

/** Title row inside a panel, with round icon actions on the right (reference style). */
export function PanelHeader({ title, description, actions }: { title: React.ReactNode; description?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-6 pt-6">
      <div className="min-w-0">
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
        {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
