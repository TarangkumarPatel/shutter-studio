import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

/**
 * Storage abstraction so the rest of the app never touches the filesystem
 * directly. Swapping to S3/Cloudinary later means writing one new class that
 * implements `StorageAdapter` and changing the export at the bottom of this
 * file — nothing else in the codebase needs to change, since callers only
 * ever deal in "keys" (public URL paths), not local file paths.
 */
export interface StorageAdapter {
  /** Persists a buffer under `key` (e.g. "uploads/web/abc123.webp") and returns its public URL path. */
  save(key: string, buffer: Buffer): Promise<string>;
  /** Deletes the object at `key`. Safe to call on a non-existent key. */
  delete(key: string): Promise<void>;
}

const PUBLIC_DIR = path.join(process.cwd(), "public");

class LocalStorageAdapter implements StorageAdapter {
  async save(key: string, buffer: Buffer): Promise<string> {
    const safeKey = normalizeKey(key);
    const filePath = path.join(PUBLIC_DIR, safeKey);
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, buffer);
    return `/${safeKey.split(path.sep).join("/")}`;
  }

  async delete(key: string): Promise<void> {
    const safeKey = normalizeKey(key);
    const filePath = path.join(PUBLIC_DIR, safeKey);
    try {
      await unlink(filePath);
    } catch (err) {
      const code = (err as NodeJS.ErrnoException).code;
      if (code !== "ENOENT") throw err;
    }
  }
}

/** Strips leading slashes and blocks path traversal — `key` is untrusted-ish (derived from generated IDs, but defend anyway). */
function normalizeKey(key: string): string {
  const cleaned = key.replace(/^\/+/, "");
  const resolved = path.normalize(cleaned);
  if (resolved.startsWith("..") || path.isAbsolute(resolved)) {
    throw new Error(`Invalid storage key: ${key}`);
  }
  return resolved;
}

/** Converts a stored public URL path (e.g. "/uploads/web/x.webp") back into a filesystem path for reading. */
export function storageKeyToFilePath(publicPath: string): string {
  const safeKey = normalizeKey(publicPath);
  return path.join(PUBLIC_DIR, safeKey);
}

export const storage: StorageAdapter = new LocalStorageAdapter();
