import Link from "next/link";
import { cn } from "@/lib/utils";

/** Pulsing red dot used wherever something is live right now. */
export function LiveDot({ className }: { className?: string }) {
  return (
    <span className={cn("relative flex size-2 shrink-0", className)} aria-hidden>
      <span className="absolute inline-flex size-full animate-ping rounded-full bg-red-500 opacity-75" />
      <span className="relative inline-flex size-2 rounded-full bg-red-600" />
    </span>
  );
}

/**
 * "LIVE" pill for subject cards. Pass `liveId` to make it a link into the
 * class lobby; leave it out when the pill sits inside another link.
 */
export function LiveBadge({ liveId, label = "Live", className }: { liveId?: string; label?: string; className?: string }) {
  const cls = cn("inline-flex shrink-0 items-center gap-1.5 rounded-full bg-red-600 px-2 py-0.5 text-[11px] font-semibold tracking-wide text-white uppercase", liveId && "hover:bg-red-500", className);
  const body = (
    <>
      <LiveDot className="[&>span]:bg-white" />
      {label}
    </>
  );
  return liveId ? (
    <Link href={`/classroom/${liveId}/lobby`} className={cls} title="Join the live class">
      {body}
    </Link>
  ) : (
    <span className={cls}>{body}</span>
  );
}
