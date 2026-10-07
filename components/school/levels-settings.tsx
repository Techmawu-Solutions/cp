"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, GraduationCap, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { setSchoolLevels } from "@/lib/actions";
import { DEFAULT_LEVELS, PROGRESSION_LABEL, levelsOf, progressionOf } from "@/lib/promotion";
import type { School } from "@/lib/types";

type Row = { key: number; orig?: string; name: string };

/**
 * The school's class levels, lowest first (spec section 22.4). Promotion moves each
 * class one level up; students who complete the last level graduate.
 */
export function LevelsSettings({ school, canEdit }: { school: School; canEdit: boolean }) {
  const toRows = (levels: string[]) => levels.map((name, key) => ({ key, orig: name, name }));
  const [rows, setRows] = useState<Row[]>(() => toRows(levelsOf(school)));
  const [nextKey, setNextKey] = useState(1000);
  const saved = levelsOf(school);
  const dirty = rows.length !== saved.length || rows.some((r, i) => r.name.trim() !== saved[i]);
  const move = (i: number, by: number) =>
    setRows((rs) => {
      const n = [...rs];
      const [r] = n.splice(i, 1);
      n.splice(i + by, 0, r!);
      return n;
    });

  return (
    <Card className="max-w-3xl">
      <CardHeader>
        <CardTitle>Class levels</CardTitle>
        <CardDescription>Lowest first. Each year students move up one level; those who complete the last level graduate. A school that runs Basic and JHS together lists both, so Basic 6 moves on to JHS 1.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <ol className="space-y-1.5">
          {rows.map((r, i) => (
            <li key={r.key} className="flex items-center gap-1.5">
              <span className="w-6 text-right text-xs text-muted-foreground tabular-nums">{i + 1}</span>
              <Input value={r.name} disabled={!canEdit} aria-label={`Level ${i + 1}`} onChange={(e) => setRows((rs) => rs.map((x) => (x.key === r.key ? { ...x, name: e.target.value } : x)))} className="max-w-56" />
              {i === rows.length - 1 && (
                <span className="inline-flex items-center gap-1 text-xs text-violet-700 dark:text-violet-300">
                  <GraduationCap className="size-3.5" /> Final year
                </span>
              )}
              {canEdit && (
                <span className="ml-auto flex gap-0.5">
                  <Button size="icon-xs" variant="ghost" disabled={i === 0} onClick={() => move(i, -1)} aria-label="Move up">
                    <ArrowUp />
                  </Button>
                  <Button size="icon-xs" variant="ghost" disabled={i === rows.length - 1} onClick={() => move(i, 1)} aria-label="Move down">
                    <ArrowDown />
                  </Button>
                  <Button size="icon-xs" variant="ghost" disabled={rows.length === 1} onClick={() => setRows((rs) => rs.filter((x) => x.key !== r.key))} aria-label="Remove level">
                    <Trash2 />
                  </Button>
                </span>
              )}
            </li>
          ))}
        </ol>
        {canEdit && (
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => (setRows((rs) => [...rs, { key: nextKey, name: "" }]), setNextKey((k) => k + 1))}>
              <Plus /> Add level
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setRows(toRows(DEFAULT_LEVELS[school.type]))}>
              Use the default levels
            </Button>
            <Button
              size="sm"
              className="ml-auto"
              disabled={!dirty}
              onClick={() => {
                const renames = Object.fromEntries(rows.filter((r) => r.orig && r.orig !== r.name.trim()).map((r) => [r.orig!, r.name.trim()]));
                const res = setSchoolLevels(school.id, rows.map((r) => r.name), renames);
                if (!res.ok) return void toast.error(res.error);
                setRows(toRows(rows.map((r) => r.name.trim()).filter(Boolean)));
                toast.success("Class levels saved", { description: Object.keys(renames).length ? "Classes in current and upcoming sessions follow the new names; closed sessions keep theirs." : undefined });
              }}
            >
              Save levels
            </Button>
          </div>
        )}
        <p className="text-xs text-muted-foreground">{`Progression: ${PROGRESSION_LABEL[progressionOf(school)]}. Set by the platform administrator.`}</p>
      </CardContent>
    </Card>
  );
}
