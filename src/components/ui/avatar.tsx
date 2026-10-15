import { cn, initials } from "@/lib/utils";

const tones = [
  "bg-[#dfe6fb] text-[#3550b8]",
  "bg-[#fde2e1] text-[#b23b3b]",
  "bg-[#dcf2e8] text-[#1f7a52]",
  "bg-[#fdefd6] text-[#9a5a06]",
  "bg-[#ece3fb] text-[#6a3fc0]",
  "bg-[#d9f0f5] text-[#1d6f84]",
  "bg-[#f3e1ee] text-[#9b2f7a]",
];

export function toneFor(name: string) {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return tones[h % tones.length];
}

function Avatar({ name, className, title }: { name: string; className?: string; title?: string }) {
  return (
    <span
      aria-hidden={!title}
      title={title}
      className={cn("inline-flex size-9 shrink-0 select-none items-center justify-center rounded-full text-xs font-semibold ring-2 ring-white", toneFor(name), className)}
    >
      {initials(name)}
    </span>
  );
}

/** Overlapping avatars like the reference header ("+N" for the rest). */
function AvatarStack({ people, max = 5, size = "size-8" }: { people: { id: string; name: string }[]; max?: number; size?: string }) {
  const shown = people.slice(0, max);
  const rest = people.length - shown.length;
  return (
    <div className="flex -space-x-2">
      {shown.map((p) => (
        <Avatar key={p.id} name={p.name} title={p.name} className={cn(size, "text-[10px]")} />
      ))}
      {rest > 0 && (
        <span className={cn("inline-flex items-center justify-center rounded-full bg-white text-[10px] font-semibold text-muted-foreground ring-2 ring-white", size)}>+{rest}</span>
      )}
    </div>
  );
}

export { Avatar, AvatarStack };
