import { redirect } from "next/navigation";
import { Clock, FolderKanban, Layers, MessageCircle } from "lucide-react";
import { getActor } from "@/server/actor";
import { LoginForm } from "./login-form";

export const metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ callbackUrl?: string }> }) {
  if (await getActor()) redirect("/");
  const { callbackUrl } = await searchParams;
  return (
    <div className="flex min-h-dvh items-center justify-center p-4 sm:p-8">
      <div className="grid grid-cols-1 w-full max-w-5xl overflow-hidden rounded-[36px] border border-white/70 bg-white/50 shadow-[0_30px_80px_-30px_rgba(20,22,27,0.25)] backdrop-blur-xl lg:grid-cols-[1.1fr_1fr]">
        <div className="relative hidden flex-col justify-between gap-10 bg-ink p-10 text-white lg:flex">
          <div className="flex items-center gap-2.5">
            <Layers className="size-7" strokeWidth={2.2} />
            <span className="text-[22px] font-medium tracking-tight">applab<span className="text-white/50">design</span></span>
          </div>
          <div className="space-y-4">
            <p className="text-[34px] font-semibold leading-[1.1] tracking-tight">Every project, every hour, every designer — in one place.</p>
            <p className="text-white/60">Track projects and ETAs, log time, discuss entries and see who&apos;s available.</p>
          </div>
          <div className="grid grid-cols-3 gap-3 text-sm">
            {[
              { icon: FolderKanban, label: "Projects" },
              { icon: Clock, label: "Timesheets" },
              { icon: MessageCircle, label: "Discussions" },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="rounded-[20px] bg-white/[0.07] p-4">
                <Icon className="mb-6 size-5 text-white/80" />
                {label}
              </div>
            ))}
          </div>
        </div>
        <div className="flex items-center justify-center p-8 sm:p-12">
          <div className="w-full max-w-sm space-y-7">
            <div className="flex items-center gap-2.5 lg:hidden">
              <Layers className="size-7" strokeWidth={2.2} />
              <span className="text-[22px] font-medium tracking-tight">applab<span className="text-muted-foreground">design</span></span>
            </div>
            <div className="space-y-1.5">
              <h1 className="text-[32px] font-semibold tracking-tight">Sign in</h1>
              <p className="text-[15px] text-muted-foreground">Use your Applab email and password.</p>
            </div>
            <LoginForm callbackUrl={callbackUrl?.startsWith("/") ? callbackUrl : "/"} />
          </div>
        </div>
      </div>
    </div>
  );
}
