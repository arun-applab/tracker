"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Re-renders server layouts once (e.g. so the sidebar unread badge updates after reading a thread). */
export function RefreshOnMount() {
  const router = useRouter();
  useEffect(() => {
    router.refresh();
  }, [router]);
  return null;
}
