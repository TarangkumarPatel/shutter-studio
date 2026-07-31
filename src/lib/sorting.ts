export const NEW_WINDOW_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

export function isNewPhoto(createdAt: Date, now: number = Date.now()): boolean {
  return now - createdAt.getTime() < NEW_WINDOW_MS;
}

/**
 * Sorting rule: pinned photos always come first, regardless of likes/order.
 * Within each tier (pinned / not), photos sort by like count descending.
 * Ties (very common — e.g. several unliked photos) fall back to the
 * admin-curated `order` (drag-and-drop in /admin) so that feature still
 * means something once likes stop being the deciding factor, then to
 * newest-first as a final tiebreaker.
 */
export function sortPhotosForGallery<
  T extends { pinned: boolean; likeCount: number; order: number; createdAt: Date },
>(photos: T[]): T[] {
  return [...photos].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return (
      b.likeCount - a.likeCount ||
      a.order - b.order ||
      b.createdAt.getTime() - a.createdAt.getTime()
    );
  });
}
