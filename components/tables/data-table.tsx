"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { AppSelect } from "@/components/common/app-select";
import { EmptyState } from "@/components/common/empty-state";
import { cn } from "@/lib/utils";

export interface Column<T> {
  key: string;
  header: React.ReactNode;
  cell: (row: T) => React.ReactNode;
  /** Enables sorting on this column. */
  sort?: (row: T) => string | number;
  className?: string;
  headClassName?: string;
}

export interface Filter<T> {
  key: string;
  label: string;
  options: { value: string; label: string }[];
  predicate: (row: T, value: string) => boolean;
}

export function DataTable<T extends { id: string }>({
  rows,
  columns,
  search,
  searchPlaceholder = "Search…",
  filters = [],
  toolbar,
  onRowClick,
  pageSize = 15,
  emptyTitle = "Nothing here yet",
  emptyDescription,
  emptyAction,
  selectable,
  selected,
  onSelectedChange,
  initialSort,
  dense,
}: {
  rows: T[];
  columns: Column<T>[];
  search?: (row: T) => string;
  searchPlaceholder?: string;
  filters?: Filter<T>[];
  toolbar?: React.ReactNode;
  onRowClick?: (row: T) => void;
  pageSize?: number;
  emptyTitle?: string;
  emptyDescription?: React.ReactNode;
  emptyAction?: React.ReactNode;
  selectable?: boolean;
  selected?: Set<string>;
  onSelectedChange?: (ids: Set<string>) => void;
  initialSort?: { key: string; dir: "asc" | "desc" };
  dense?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [sort, setSort] = useState(initialSort ?? null);
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let out = rows.filter((r) => (!q || !search ? true : search(r).toLowerCase().includes(q)));
    for (const f of filters) {
      const v = filterValues[f.key];
      if (v && v !== "__all") out = out.filter((r) => f.predicate(r, v));
    }
    if (sort) {
      const col = columns.find((c) => c.key === sort.key);
      if (col?.sort) {
        const get = col.sort;
        out = [...out].sort((a, b) => {
          const x = get(a);
          const y = get(b);
          const cmp = typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y), undefined, { numeric: true });
          return sort.dir === "asc" ? cmp : -cmp;
        });
      }
    }
    return out;
  }, [rows, query, search, filters, filterValues, sort, columns]);

  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const current = Math.min(page, pages - 1);
  const visible = filtered.slice(current * pageSize, current * pageSize + pageSize);
  const allVisibleSelected = selectable && visible.length > 0 && visible.every((r) => selected?.has(r.id));

  const toggleAll = () => {
    const next = new Set(selected);
    if (allVisibleSelected) visible.forEach((r) => next.delete(r.id));
    else filtered.forEach((r) => next.add(r.id));
    onSelectedChange?.(next);
  };

  return (
    <div className="space-y-3">
      {(search || filters.length > 0 || toolbar) && (
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
          {search && (
            <div className="relative flex-1 lg:max-w-xs">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(0);
                }}
                placeholder={searchPlaceholder}
                className="pl-8"
                aria-label="Search"
              />
            </div>
          )}
          {filters.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {filters.map((f) => (
                <AppSelect
                  key={f.key}
                  aria-label={f.label}
                  className="w-auto min-w-36"
                  value={filterValues[f.key] ?? "__all"}
                  onChange={(v) => {
                    setFilterValues((s) => ({ ...s, [f.key]: v }));
                    setPage(0);
                  }}
                  options={[{ value: "__all", label: `All ${f.label.toLowerCase()}` }, ...f.options]}
                />
              ))}
            </div>
          )}
          {toolbar && <div className="flex flex-wrap items-center gap-2 lg:ml-auto">{toolbar}</div>}
        </div>
      )}

      {filtered.length === 0 ? (
        <EmptyState title={query ? "No matches" : emptyTitle} description={query ? `Nothing matches "${query}".` : emptyDescription} action={query ? undefined : emptyAction} />
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                {selectable && (
                  <TableHead className="w-10">
                    <Checkbox checked={!!allVisibleSelected} onCheckedChange={toggleAll} aria-label="Select all" />
                  </TableHead>
                )}
                {columns.map((c) => (
                  <TableHead key={c.key} className={cn("text-xs font-medium tracking-wide text-muted-foreground uppercase", c.headClassName)}>
                    {c.sort ? (
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 uppercase hover:text-foreground"
                        onClick={() => setSort((s) => (s?.key === c.key ? { key: c.key, dir: s.dir === "asc" ? "desc" : "asc" } : { key: c.key, dir: "asc" }))}
                      >
                        {c.header}
                        {sort?.key === c.key && (sort.dir === "asc" ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />)}
                      </button>
                    ) : (
                      c.header
                    )}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((r) => (
                <TableRow key={r.id} className={cn(onRowClick && "cursor-pointer")} onClick={onRowClick ? () => onRowClick(r) : undefined} data-state={selected?.has(r.id) ? "selected" : undefined}>
                  {selectable && (
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={!!selected?.has(r.id)}
                        onCheckedChange={() => {
                          const next = new Set(selected);
                          if (next.has(r.id)) next.delete(r.id);
                          else next.add(r.id);
                          onSelectedChange?.(next);
                        }}
                        aria-label="Select row"
                      />
                    </TableCell>
                  )}
                  {columns.map((c) => (
                    <TableCell key={c.key} className={cn(dense ? "py-1.5" : "py-2.5", c.className)}>
                      {c.cell(r)}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {filtered.length > pageSize && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            {current * pageSize + 1}–{Math.min(filtered.length, (current + 1) * pageSize)} of {filtered.length}
            {selectable && selected && selected.size > 0 && <> · {selected.size} selected</>}
          </span>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon-sm" disabled={current === 0} onClick={() => setPage(current - 1)} aria-label="Previous page">
              <ChevronLeft />
            </Button>
            <span className="px-2 tabular-nums">
              {current + 1} / {pages}
            </span>
            <Button variant="outline" size="icon-sm" disabled={current >= pages - 1} onClick={() => setPage(current + 1)} aria-label="Next page">
              <ChevronRight />
            </Button>
          </div>
        </div>
      )}
      {filtered.length <= pageSize && selectable && selected && selected.size > 0 && <p className="text-sm text-muted-foreground">{selected.size} selected</p>}
    </div>
  );
}
