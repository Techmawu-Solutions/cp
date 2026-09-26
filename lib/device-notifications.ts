"use client";

/**
 * Device (system) notifications. The service worker in public/sw.js shows
 * them, so they also work when ClassProject is installed as an app — on
 * Android and iOS a page can't call `new Notification()` directly. Pushes
 * that reach a closed app need the backend to send Web Push to that worker.
 */

export type DevicePermission = NotificationPermission | "unsupported";

export function devicePermission(): DevicePermission {
  return typeof window !== "undefined" && "Notification" in window ? Notification.permission : "unsupported";
}

export async function requestDevicePermission(): Promise<DevicePermission> {
  if (devicePermission() === "unsupported") return "unsupported";
  return Notification.requestPermission();
}

export function registerServiceWorker() {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
  navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch(() => {});
}

export async function showDeviceNotification(n: { title: string; body: string; href: string; tag?: string }): Promise<boolean> {
  if (devicePermission() !== "granted") return false;
  const options: NotificationOptions = { body: n.body, icon: "/icon-192.png", badge: "/icon-192.png", tag: n.tag, data: { href: n.href } };
  try {
    const reg = "serviceWorker" in navigator ? await Promise.race([navigator.serviceWorker.ready, new Promise<null>((r) => setTimeout(() => r(null), 1500))]) : null;
    if (reg) {
      await reg.showNotification(n.title, options);
      return true;
    }
    const shown = new Notification(n.title, options);
    shown.onclick = () => {
      window.focus();
      window.location.assign(n.href);
    };
    return true;
  } catch {
    return false;
  }
}
