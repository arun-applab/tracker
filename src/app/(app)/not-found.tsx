import Link from "next/link";
import { SearchX } from "lucide-react";
import { EmptyState } from "@/components/app/empty-state";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <EmptyState
      icon={SearchX}
      title="Not found"
      description="This page doesn't exist, or you don't have access to it."
      action={<Button asChild><Link href="/">Back to dashboard</Link></Button>}
      className="mt-10"
    />
  );
}
