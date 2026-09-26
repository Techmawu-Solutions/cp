/**
 * Whether course sections and content are visible to students. Teachers
 * publish now, keep a draft, or schedule a release: a published item with a
 * future `availableFrom` stays hidden until that time.
 */
export type PublishState = "draft" | "scheduled" | "published";

export function publishState(x: { published: boolean; availableFrom?: string }, now = Date.now()): PublishState {
  if (!x.published) return "draft";
  return x.availableFrom && Date.parse(x.availableFrom) > now ? "scheduled" : "published";
}

/** Visible to students right now. */
export const isLive = (x: { published: boolean; availableFrom?: string }, now = Date.now()) => publishState(x, now) === "published";
