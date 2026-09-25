"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AppSelect } from "@/components/common/app-select";
import { Field } from "@/components/forms/field";
import { scheduleLive } from "@/lib/actions";
import type { Course } from "@/lib/types";

function localInputValue(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Schedule Class → students receive a notification (spec §33). */
export function ScheduleLiveDialog({ open, onOpenChange, courses, defaultCourseId }: { open: boolean; onOpenChange: (o: boolean) => void; courses: Course[]; defaultCourseId?: string }) {
  const [courseId, setCourseId] = useState(defaultCourseId ?? "");
  const [title, setTitle] = useState("");
  const [when, setWhen] = useState(() => {
    const d = new Date(Date.now() + 60 * 60_000);
    d.setMinutes(Math.ceil(d.getMinutes() / 15) * 15, 0, 0);
    return localInputValue(d);
  });
  const [duration, setDuration] = useState("60");
  const [waitingRoom, setWaitingRoom] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const selected = courseId || defaultCourseId || "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Schedule live class</DialogTitle>
          <DialogDescription>Students in the class are notified immediately and again when the class starts.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          {courses.length > 1 && (
            <Field label="Course" className="sm:col-span-2" required>
              <AppSelect value={selected} onChange={setCourseId} options={courses.map((c) => ({ value: c.id, label: c.title }))} placeholder="Select course" />
            </Field>
          )}
          <Field label="Topic" htmlFor="lt" className="sm:col-span-2" required>
            <Input id="lt" value={title} onChange={(e) => (setTitle(e.target.value), setErr(null))} placeholder="e.g. Introduction to Networking" />
          </Field>
          <Field label="Date & time" htmlFor="lw" required>
            <Input id="lw" type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />
          </Field>
          <Field label="Duration">
            <AppSelect value={duration} onChange={setDuration} options={["30", "45", "60", "75", "90", "120"].map((m) => ({ value: m, label: `${m} minutes` }))} />
          </Field>
          <label className="flex items-center justify-between gap-3 text-sm sm:col-span-2">
            <span>
              Waiting room
              <span className="block text-xs text-muted-foreground">Admit students manually when they join.</span>
            </span>
            <Switch checked={waitingRoom} onCheckedChange={setWaitingRoom} />
          </label>
          {err && <p className="text-sm text-destructive sm:col-span-2">{err}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              const course = courses.find((c) => c.id === selected);
              if (!course) return setErr("Choose a course");
              if (title.trim().length < 3) return setErr("Enter a topic");
              const at = new Date(when);
              if (Number.isNaN(at.getTime())) return setErr("Pick a date and time");
              if (at.getTime() < Date.now() - 15 * 60_000) return setErr("That time is in the past");
              scheduleLive(course, { title: title.trim(), scheduledAt: at.toISOString(), durationMinutes: Number(duration), waitingRoom });
              toast.success("Live class scheduled", { description: "Students have been notified." });
              setTitle("");
              onOpenChange(false);
            }}
          >
            Schedule
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
