"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AppSelect } from "@/components/common/app-select";
import { Field } from "@/components/forms/field";
import { scheduleLive } from "@/lib/actions";
import type { Course } from "@/lib/types";
import { cn } from "@/lib/utils";

const pad = (n: number) => String(n).padStart(2, "0");
const dateValue = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const timeValue = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
const toMinutes = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return h! * 60 + m!;
};
const fromMinutes = (m: number) => `${pad(Math.floor(m / 60) % 24)}:${pad(m % 60)}`;
const fmtLength = (m: number) => (m < 60 ? `${m} min` : `${Math.floor(m / 60)} h${m % 60 ? ` ${m % 60} min` : ""}`);

const QUICK_LENGTHS = [30, 45, 60, 90, 120];
const MAX_MINUTES = 6 * 60;

/** Schedule Class → students receive a notification (spec section 33). */
export function ScheduleLiveDialog({ open, onOpenChange, courses, defaultCourseId }: { open: boolean; onOpenChange: (o: boolean) => void; courses: Course[]; defaultCourseId?: string }) {
  const [initial] = useState(() => {
    const d = new Date(Date.now() + 60 * 60_000);
    d.setMinutes(Math.ceil(d.getMinutes() / 15) * 15, 0, 0);
    return d;
  });
  const [courseId, setCourseId] = useState(defaultCourseId ?? "");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(() => dateValue(initial));
  const [start, setStart] = useState(() => timeValue(initial));
  const [end, setEnd] = useState(() => fromMinutes(toMinutes(timeValue(initial)) + 60));
  const [waitingRoom, setWaitingRoom] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const selected = courseId || defaultCourseId || "";
  const length = start && end ? toMinutes(end) - toMinutes(start) : 0;

  // Moving the start keeps the class the same length.
  const changeStart = (v: string) => {
    setErr(null);
    if (v && start && end && length > 0) setEnd(fromMinutes(Math.min(toMinutes(v) + length, 23 * 60 + 59)));
    setStart(v);
  };

  const submit = () => {
    const course = courses.find((c) => c.id === selected);
    if (!course) return setErr("Choose a course");
    if (title.trim().length < 3) return setErr("Enter a topic");
    const at = new Date(`${date}T${start}`);
    if (!date || !start || Number.isNaN(at.getTime())) return setErr("Pick a date and start time");
    if (!end) return setErr("Pick an end time");
    if (length <= 0) return setErr("The end time must be after the start time");
    if (length < 10) return setErr("A live class must be at least 10 minutes");
    if (length > MAX_MINUTES) return setErr("A live class can be at most 6 hours");
    if (at.getTime() < Date.now() - 15 * 60_000) return setErr("That time is in the past");
    scheduleLive(course, { title: title.trim(), description: description.trim() || undefined, scheduledAt: at.toISOString(), durationMinutes: length, waitingRoom });
    toast.success("Live class scheduled", { description: "Students have been notified." });
    setTitle("");
    setDescription("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Schedule live class</DialogTitle>
          <DialogDescription>Students in the class are notified immediately and again when the class starts.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-6">
          {courses.length > 1 && (
            <Field label="Course" className="sm:col-span-6" required>
              <AppSelect value={selected} onChange={setCourseId} options={courses.map((c) => ({ value: c.id, label: c.title }))} placeholder="Select course" />
            </Field>
          )}
          <Field label="Topic" htmlFor="lt" className="sm:col-span-6" required>
            <Input id="lt" value={title} onChange={(e) => (setTitle(e.target.value), setErr(null))} placeholder="e.g. Introduction to Networking" />
          </Field>
          <Field label="Description" htmlFor="ld" className="sm:col-span-6" hint="What the class covers and anything students should prepare. Shown to students before they join.">
            <Textarea id="ld" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. We'll cover LAN, WAN and network topologies. Bring your notes from last week." />
          </Field>
          <Field label="Date" htmlFor="ldate" className="sm:col-span-2" required>
            <Input id="ldate" type="date" value={date} onChange={(e) => (setDate(e.target.value), setErr(null))} />
          </Field>
          <Field label="Start time" htmlFor="lstart" className="sm:col-span-2" required>
            <Input id="lstart" type="time" step={300} value={start} onChange={(e) => changeStart(e.target.value)} />
          </Field>
          <Field label="End time" htmlFor="lend" className="sm:col-span-2" required>
            <Input id="lend" type="time" step={300} value={end} onChange={(e) => (setEnd(e.target.value), setErr(null))} aria-invalid={!!end && length <= 0} />
          </Field>
          <div className="flex flex-wrap items-center gap-1.5 sm:col-span-6">
            <span className="mr-1 text-xs text-muted-foreground">Length:</span>
            {QUICK_LENGTHS.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => (setEnd(fromMinutes(Math.min(toMinutes(start) + m, 23 * 60 + 59))), setErr(null))}
                className={cn("rounded-full border px-2.5 py-0.5 text-xs hover:bg-muted", length === m && "border-primary bg-primary/10 text-primary")}
              >
                {fmtLength(m)}
              </button>
            ))}
            <span className={cn("ml-auto text-xs", length > 0 ? "text-muted-foreground" : "text-destructive")}>{length > 0 ? `${fmtLength(length)} class` : "End time must be after start time"}</span>
          </div>
          <label className="flex items-center justify-between gap-3 text-sm sm:col-span-6">
            <span>
              Waiting room
              <span className="block text-xs text-muted-foreground">Admit students manually when they join.</span>
            </span>
            <Switch checked={waitingRoom} onCheckedChange={setWaitingRoom} />
          </label>
          {err && <p className="text-sm text-destructive sm:col-span-6">{err}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit}>Schedule</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
