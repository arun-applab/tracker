"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

export type SortDir = "asc" | "desc";
export type SortValue = string | number | null | undefined;

export type SortColumn = {
  label: React.ReactNode;
  /** Header / cell classes (e.g. "pl-6", "text-right"). */
  className?: string;
  cellClassName?: string;
  /** false = not sortable (e.g. actions). */
  sortable?: boolean;
  /** Direction used on the first click. Defaults to asc for text, desc for numbers/dates. */
  firstDir?: SortDir;
};

export type SortRow = {
  id: string;
  cells: React.ReactNode[];
  /** One value per column, used for sorting (dates as ISO strings or timestamps). */
  sort: SortValue[];
  className?: string;
};

export function compareValues(a: SortValue, b: SortValue) {
  const an = a === null || a === undefined || a === "";
  const bn = b === null || b === undefined || b === "";
  if (an || bn) return an && bn ? 0 : an ? 1 : -1; // empty values always last
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: "base" });
}

/** Sort state + a header button. Shared by SortableTable and tables that render their own rows. */
export function useSort<T>(rows: T[], valueOf: (row: T, col: number) => SortValue, initial: { col: number; dir: SortDir }) {
  const [sort, setSort] = useState(initial);
  const sorted = useMemo(() => {
    const out = [...rows];
    out.sort((x, y) => {
      const c = compareValues(valueOf(x, sort.col), valueOf(y, sort.col));
      const empty = (v: SortValue) => v === null || v === undefined || v === "";
      // Keep empty values at the bottom whichever way we sort.
      if (empty(valueOf(x, sort.col)) || empty(valueOf(y, sort.col))) return c;
      return sort.dir === "asc" ? c : -c;
    });
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, sort]);
  function toggle(col: number, firstDir: SortDir = "asc") {
    setSort((s) => (s.col === col ? { col, dir: s.dir === "asc" ? "desc" : "asc" } : { col, dir: firstDir }));
  }
  return { sorted, sort, toggle };
}

export function SortHeaderButton({ label, active, dir, onClick, align }: { label: React.ReactNode; active: boolean; dir: SortDir; onClick: () => void; align?: "right" }) {
  const Icon = !active ? ArrowUpDown : dir === "asc" ? ArrowUp : ArrowDown;
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "-mx-1 inline-flex cursor-pointer items-center gap-1 rounded-full px-1 py-0.5 transition hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/40 outline-none",
        active && "font-medium text-foreground",
        align === "right" && "flex-row-reverse",
      )}
      aria-label={typeof label === "string" ? `Sort by ${label}` : undefined}
    >
      {label}
      <Icon className={cn("size-3.5 shrink-0", !active && "opacity-40")} />
    </button>
  );
}

/**
 * A table whose column headers sort the rows (click again to flip the direction).
 * Cells are rendered on the server and passed in; only the ordering happens here.
 */
export function SortableTable({
  columns,
  rows,
  defaultSort,
  className,
}: {
  columns: SortColumn[];
  rows: SortRow[];
  defaultSort: { col: number; dir: SortDir };
  className?: string;
}) {
  const { sorted, sort, toggle } = useSort(rows, (r, c) => r.sort[c], defaultSort);
  return (
    <Table className={className}>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          {columns.map((c, i) => {
            const right = c.className?.includes("text-right");
            const firstDir = c.firstDir ?? (typeof rows[0]?.sort[i] === "number" ? "desc" : "asc");
            return (
              <TableHead key={i} className={c.className} aria-sort={sort.col === i ? (sort.dir === "asc" ? "ascending" : "descending") : undefined}>
                {c.sortable === false ? c.label : <SortHeaderButton label={c.label} active={sort.col === i} dir={sort.dir} onClick={() => toggle(i, firstDir)} align={right ? "right" : undefined} />}
              </TableHead>
            );
          })}
        </TableRow>
      </TableHeader>
      <TableBody>
        {sorted.map((r) => (
          <TableRow key={r.id} className={r.className}>
            {r.cells.map((cell, i) => (
              <TableCell key={i} className={columns[i]?.cellClassName}>
                {cell}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
