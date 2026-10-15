"use client";

import { Toaster as Sonner } from "sonner";

function Toaster() {
  return <Sonner position="top-right" richColors closeButton toastOptions={{ classNames: { toast: "text-sm" } }} />;
}

export { Toaster };
