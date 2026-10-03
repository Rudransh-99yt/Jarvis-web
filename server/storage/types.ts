// Provider-Agnostic Storage Architecture Types (Milestone 10)
import type { Readable } from 'node:stream';

export interface StorageObjectMetadata {
  storageKey: string;
  sizeBytes: number;
  sha256: string;
  mimeType?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StoragePutResult {
  storageKey: string;
  sizeBytes: number;
  sha256: string;
}

export interface StoragePutOptions {
  mimeType?: string;
  overwrite?: boolean;
}

export interface IStorageProvider {
  readonly name: string;

  /** Initialize storage directory or remote client credentials */
  init(): Promise<void>;

  /** Store raw bytes under a designated internal storage key */
  putObject(key: string, data: Buffer | Uint8Array, options?: StoragePutOptions): Promise<StoragePutResult>;

  /** Retrieve full buffer for an internal storage key */
  getObject(key: string): Promise<Buffer | null>;

  /** Retrieve readable stream for streaming large objects */
  getObjectStream(key: string): Promise<Readable | null>;

  /** Permanently delete an object by key */
  deleteObject(key: string): Promise<boolean>;

  /** Check if an object exists */
  hasObject(key: string): Promise<boolean>;

  /** Retrieve object metadata (size, hash, timestamps) */
  getObjectMetadata(key: string): Promise<StorageObjectMetadata | null>;

  /** Generate controlled access reference or presigned URL (cloud-ready) */
  getSignedUrl?(key: string, operation: 'read' | 'write', expiresInSeconds?: number): Promise<string>;
}
