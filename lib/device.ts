/**
 * Phone or tablet. Mobile browsers can't share the screen — some (Android
 * Chrome, iOS Safari) even expose getDisplayMedia and then refuse — so
 * features like screen sharing check the device, not just the API.
 */
export function isMobileDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  const hint = (navigator as Navigator & { userAgentData?: { mobile?: boolean } }).userAgentData?.mobile;
  if (hint) return true;
  const ua = navigator.userAgent;
  // iPadOS reports itself as a Mac; a Mac with a touch screen is an iPad.
  const iPad = /Macintosh/.test(ua) && navigator.maxTouchPoints > 1;
  return iPad || /Android|iPhone|iPad|iPod|Mobile|Tablet|Silk|Kindle/i.test(ua);
}

/** Whether this device can share its screen from the browser. */
export const canShareScreen = () => typeof navigator !== "undefined" && !!navigator.mediaDevices?.getDisplayMedia && !isMobileDevice();
