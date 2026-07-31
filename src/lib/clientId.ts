const CLIENT_ID_KEY = "pp_client_id";
const LIKED_PHOTOS_KEY = "pp_liked_photos";
const MY_COMMENTS_KEY = "pp_my_comments";

function randomId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/** Stable per-browser id, persisted in localStorage — used for one-like-per-browser dedupe. */
export function getOrCreateClientId(): string {
  if (typeof window === "undefined") return "";
  let id = window.localStorage.getItem(CLIENT_ID_KEY);
  if (!id) {
    id = randomId();
    window.localStorage.setItem(CLIENT_ID_KEY, id);
  }
  return id;
}

export function getLikedPhotoIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(LIKED_PHOTOS_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

export function markPhotoLiked(photoId: string): void {
  if (typeof window === "undefined") return;
  const liked = getLikedPhotoIds();
  liked.add(photoId);
  window.localStorage.setItem(LIKED_PHOTOS_KEY, JSON.stringify([...liked]));
}

export function unmarkPhotoLiked(photoId: string): void {
  if (typeof window === "undefined") return;
  const liked = getLikedPhotoIds();
  liked.delete(photoId);
  window.localStorage.setItem(LIKED_PHOTOS_KEY, JSON.stringify([...liked]));
}

/** Comment ids authored by this browser — drives showing edit/delete on your own comments. */
export function getMyCommentIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(MY_COMMENTS_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

export function markCommentMine(commentId: string): void {
  if (typeof window === "undefined") return;
  const mine = getMyCommentIds();
  mine.add(commentId);
  window.localStorage.setItem(MY_COMMENTS_KEY, JSON.stringify([...mine]));
}

export function unmarkCommentMine(commentId: string): void {
  if (typeof window === "undefined") return;
  const mine = getMyCommentIds();
  mine.delete(commentId);
  window.localStorage.setItem(MY_COMMENTS_KEY, JSON.stringify([...mine]));
}
