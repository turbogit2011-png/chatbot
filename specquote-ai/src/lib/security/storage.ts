import { createHmac, timingSafeEqual } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

/**
 * Private object storage adapter. Ships with a local-filesystem
 * implementation so the whole app runs with zero external dependencies.
 * Swap `LocalStorageAdapter` for an S3/GCS-backed implementation of the same
 * interface to go to production — nothing above this layer needs to change.
 */
export interface StorageAdapter {
  save(key: string, data: Buffer): Promise<void>;
  read(key: string): Promise<Buffer>;
}

function storageRoot(): string {
  return path.resolve(/* turbopackIgnore: true */ process.cwd(), process.env.STORAGE_ROOT ?? "./storage");
}

class LocalStorageAdapter implements StorageAdapter {
  private resolveKey(key: string): string {
    if (key.includes("..") || path.isAbsolute(key)) {
      throw new Error("Invalid storage key.");
    }
    return path.join(storageRoot(), key);
  }

  async save(key: string, data: Buffer): Promise<void> {
    const fullPath = this.resolveKey(key);
    await mkdir(path.dirname(fullPath), { recursive: true });
    await writeFile(fullPath, data);
  }

  async read(key: string): Promise<Buffer> {
    return readFile(this.resolveKey(key));
  }
}

export const storage: StorageAdapter = new LocalStorageAdapter();

// ---------------------------------------------------------------------------
// Signed URLs — short-lived HMAC-signed tokens so uploaded attachments and
// generated PDFs are never served from a guessable/public path.
// ---------------------------------------------------------------------------

function getSigningSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is required to sign storage URLs.");
  return secret;
}

export function signStorageKey(key: string, orgId: string, ttlSeconds = 300): string {
  const expiresAt = Date.now() + ttlSeconds * 1000;
  const payload = `${key}:${orgId}:${expiresAt}`;
  const signature = createHmac("sha256", getSigningSecret()).update(payload).digest("hex");
  return Buffer.from(`${payload}:${signature}`).toString("base64url");
}

export function verifyStorageToken(
  token: string,
): { key: string; orgId: string } | null {
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf8");
    const parts = decoded.split(":");
    if (parts.length !== 4) return null;
    const [key, orgId, expiresAtStr, signature] = parts;
    const payload = `${key}:${orgId}:${expiresAtStr}`;
    const expectedSignature = createHmac("sha256", getSigningSecret()).update(payload).digest("hex");

    const a = Buffer.from(signature);
    const b = Buffer.from(expectedSignature);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

    if (Date.now() > Number(expiresAtStr)) return null;
    return { key, orgId };
  } catch {
    return null;
  }
}

export function buildSignedFileUrl(key: string, orgId: string, ttlSeconds = 300): string {
  const token = signStorageKey(key, orgId, ttlSeconds);
  return `/api/files/${encodeURIComponent(token)}`;
}
