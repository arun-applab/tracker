import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Loading">
      <Skeleton className="mb-2 h-8 w-64" />
      <Skeleton className="mb-6 h-4 w-96 max-w-full" />
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-[24px] bg-white/60" />
        ))}
      </div>
      <div className="panel space-y-2 p-5">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-10 rounded-2xl bg-white/70" />
        ))}
      </div>
    </div>
  );
}
