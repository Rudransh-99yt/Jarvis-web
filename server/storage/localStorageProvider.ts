// Local Disk Implementation of StorageProvider (Milestone 10)
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import type { Readable } from 'node:stream';
import type { IStorageProvider, StorageObjectMetadata, StoragePutOptions, StoragePutResult } from './types.ts';

export class LocalStorageProvider implements IStorageProvider {
  public readonly name = 'local-disk';
  private baseDir: string;
  private initialized = false;

  constructor(customBaseDir?: string) {
    this.baseDir = customBaseDir || path.resolve(process.cwd(), 'data', 'storage', 'objects');
  }

  async init(): Promise<void> {
    if (this.initialized) return;
    await fs.promises.mkdir(this.baseDir, { recursive: true });
    this.initialized = true;
  }

  /**
   * Sanitizes key to guarantee path cannot escape this.baseDir.
   */
  private resolveSafePath(key: string): string {
    const sanitizedKey = key.replace(/[^a-zA-Z0-9._-]/g, '_');
    if (!sanitizedKey || sanitizedKey.includes('..')) {
      throw new Error(`Invalid storage key: "${key}"`);
    }
    const resolved = path.resolve(this.baseDir, sanitizedKey);
    if (!resolved.startsWith(this.baseDir)) {
      throw new Error(`Path traversal attempt detected with key "${key}"`);
    }
    return resolved;
  }

  async putObject(key: string, data: Buffer | Uint8Array, options?: StoragePutOptions): Promise<StoragePutResult> {
    await this.init();
    const filePath = this.resolveSafePath(key);
    const buf = Buffer.isBuffer(data) ? data : Buffer.from(data);
    const sha256 = crypto.createHash('sha256').update(buf).digest('hex');

    // Atomic write via temporary file
    const tmpPath = `${filePath}.tmp.${Date.now()}.${Math.random().toString(36).substring(2, 7)}`;
    await fs.promises.writeFile(tmpPath, buf);
    await fs.promises.rename(tmpPath, filePath);

    // Save lightweight sidecar metadata for fast stat recovery
    const metaPath = `${filePath}.meta.json`;
    const meta: StorageObjectMetadata = {
      storageKey: key,
      sizeBytes: buf.length,
      sha256,
      mimeType: options?.mimeType || 'application/octet-stream',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    try {
      await fs.promises.writeFile(metaPath, JSON.stringify(meta, null, 2), 'utf-8');
    } catch {
      // Non-critical sidecar write failure ignored
    }

    return {
      storageKey: key,
      sizeBytes: buf.length,
      sha256
    };
  }

  async getObject(key: string): Promise<Buffer | null> {
    try {
      const filePath = this.resolveSafePath(key);
      return await fs.promises.readFile(filePath);
    } catch (err: any) {
      if (err.code === 'ENOENT') return null;
      throw err;
    }
  }

  async getObjectStream(key: string): Promise<Readable | null> {
    try {
      const filePath = this.resolveSafePath(key);
      await fs.promises.access(filePath, fs.constants.R_OK);
      return fs.createReadStream(filePath);
    } catch (err: any) {
      if (err.code === 'ENOENT') return null;
      throw err;
    }
  }

  async deleteObject(key: string): Promise<boolean> {
    try {
      const filePath = this.resolveSafePath(key);
      await fs.promises.unlink(filePath);
      // Clean up sidecar metadata if present
      try {
        await fs.promises.unlink(`${filePath}.meta.json`);
      } catch {}
      return true;
    } catch (err: any) {
      if (err.code === 'ENOENT') return false;
      throw err;
    }
  }

  async hasObject(key: string): Promise<boolean> {
    try {
      const filePath = this.resolveSafePath(key);
      await fs.promises.access(filePath, fs.constants.F_OK);
      return true;
    } catch {
      return false;
    }
  }

  async getObjectMetadata(key: string): Promise<StorageObjectMetadata | null> {
    try {
      const filePath = this.resolveSafePath(key);
      const stat = await fs.promises.stat(filePath);
      
      // Try sidecar first for cached sha256 and mimeType
      const metaPath = `${filePath}.meta.json`;
      try {
        const raw = await fs.promises.readFile(metaPath, 'utf-8');
        const parsed = JSON.parse(raw);
        return {
          ...parsed,
          sizeBytes: stat.size,
          updatedAt: stat.mtime.toISOString()
        };
      } catch {
        // Fallback: compute hash directly from file
        const buf = await fs.promises.readFile(filePath);
        const sha256 = crypto.createHash('sha256').update(buf).digest('hex');
        return {
          storageKey: key,
          sizeBytes: stat.size,
          sha256,
          createdAt: stat.birthtime.toISOString(),
          updatedAt: stat.mtime.toISOString()
        };
      }
    } catch (err: any) {
      if (err.code === 'ENOENT') return null;
      throw err;
    }
  }

  async getSignedUrl(key: string, operation: 'read' | 'write' = 'read', expiresInSeconds: number = 3600): Promise<string> {
    // For local development, generate an internal API reference with expiration
    const expiry = Date.now() + expiresInSeconds * 1000;
    const token = crypto
      .createHmac('sha256', 'jarvis-local-storage-secret')
      .update(`${key}:${operation}:${expiry}`)
      .digest('hex')
      .substring(0, 16);
    return `/api/files/download-direct?key=${encodeURIComponent(key)}&token=${token}&exp=${expiry}`;
  }

  getBaseDir(): string {
    return this.baseDir;
  }
}

export const defaultLocalStorageProvider = new LocalStorageProvider();
