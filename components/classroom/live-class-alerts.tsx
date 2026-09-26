"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useLiveNow } from "@/lib/live";
import { useStore } from "@/lib/store";
import { useUi } from "@/lib/ui-store";
import { useCurrentUser } from "@/lib/session";
import { registerServiceWorker, showDeviceNotification } from "@/lib/device-notifications";

const KEY = "classproject-live-alerted";

function readAlerted(userId: string): string[] {
  try {
    return JSON.parse(localStorage.getItem(`${KEY}:${userId}`) ?? "[]") as string[];
  } catch {
    return [];
  }
}

/**
 * Tells a student, once per class, that one of their live classes is in
 * progress: an in-app toast with a Join button and — if they've allowed it —
 * a device notification, which also appears when ClassProject is installed
 * as an app. Renders nothing.
 */
export function LiveClassAlerts() {
  const me = useCurrentUser();
  const router = useRouter();
  const { sessions } = useLiveNow();
  const deviceAlerts = useUi((s) => s.deviceAlerts);
  const courses = useStore((s) => s.courses);
  const userId = me?.user.id;
  const isStudent = me?.portal === "student";

  useEffect(() => registerServiceWorker(), []);

  useEffect(() => {
    if (!userId || !isStudent) return;
    const alerted = readAlerted(userId);
    const fresh = sessions.filter((l) => !alerted.includes(l.id));
    if (fresh.length === 0) return;
    for (const l of fresh) {
      const course = courses.find((c) => c.id === l.courseId);
      const href = `/classroom/${l.id}/lobby`;
      const body = `${course?.title ?? "Your class"}: ${l.title}`;
      toast("Live class in progress", { description: body, duration: 15_000, action: { label: "Join", onClick: () => router.push(href) } });
      if (deviceAlerts) void showDeviceNotification({ title: "Live class started", body: `${body}. Tap to join.`, href, tag: `live-${l.id}` });
    }
    // Remember only classes that are still live so the list doesn't grow forever.
    const liveIds = new Set(sessions.map((l) => l.id));
    localStorage.setItem(`${KEY}:${userId}`, JSON.stringify([...alerted.filter((id) => liveIds.has(id)), ...fresh.map((l) => l.id)]));
  }, [sessions, userId, isStudent, deviceAlerts, courses, router]);

  return null;
}
