"use client";

import { AlertTriangle } from "lucide-react";
import { EmptyState } from "@/components/app/empty-state";
import { Button } from "@/components/ui/button";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <EmptyState
      icon={AlertTriangle}
      title="Something went wrong"
      description="The page couldn't load. Try again — if it keeps happening, let your Design Head know."
      action={<Button onClick={reset}>Try again</Button>}
      className="mt-10"
    />
  );
}
