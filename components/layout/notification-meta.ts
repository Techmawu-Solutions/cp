import { Bell, BookOpen, CheckCircle2, CircleHelp, FileVideo, Megaphone, NotebookPen, Radio, Settings, Video } from "lucide-react";
import type { NotificationKind } from "@/lib/types";

/** Spec §41 notification types. */
export const NOTIFICATION_META: Record<NotificationKind, { label: string; icon: typeof Bell; bg: string; fg: string }> = {
  assignment: { label: "New Assignment", icon: NotebookPen, bg: "bg-blue-500/12", fg: "text-blue-600 dark:text-blue-300" },
  quiz: { label: "New Quiz", icon: CircleHelp, bg: "bg-violet-500/12", fg: "text-violet-600 dark:text-violet-300" },
  material: { label: "New Course Material", icon: BookOpen, bg: "bg-teal-500/12", fg: "text-teal-600 dark:text-teal-300" },
  live_upcoming: { label: "Upcoming Live Class", icon: Video, bg: "bg-amber-500/15", fg: "text-amber-700 dark:text-amber-300" },
  live_starting: { label: "Live Class Starting", icon: Radio, bg: "bg-red-500/12", fg: "text-red-600 dark:text-red-300" },
  graded: { label: "Assignment Graded", icon: CheckCircle2, bg: "bg-emerald-500/12", fg: "text-emerald-600 dark:text-emerald-300" },
  announcement: { label: "New Announcement", icon: Megaphone, bg: "bg-orange-500/12", fg: "text-orange-600 dark:text-orange-300" },
  recording: { label: "Recording Available", icon: FileVideo, bg: "bg-sky-500/12", fg: "text-sky-600 dark:text-sky-300" },
  system: { label: "System", icon: Settings, bg: "bg-muted", fg: "text-muted-foreground" },
};
