// Secure File Upload Validation (Milestone 10)
import path from 'node:path';
import type { FileValidationResult } from '../../src/types/storage.ts';

export interface ValidationConfig {
  maxSizeBytes?: number; // Default 25 MB
  allowedExtensions?: string[];
  allowedMimeTypes?: string[];
}

export const DEFAULT_MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB
export const DEFAULT_MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100 MB

export const ALLOWED_EXTENSIONS = [
  'pdf',
  'png',
  'jpg',
  'jpeg',
  'webp',
  'txt',
  'md',
  'docx',
  'mp4',
  'webm',
  'ogg',
  'mov',
  'm4v'
];

export const MIME_TYPE_MAP: Record<string, string> = {
  pdf: 'application/pdf',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  txt: 'text/plain',
  md: 'text/markdown',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  mp4: 'video/mp4',
  m4v: 'video/mp4',
  webm: 'video/webm',
  ogg: 'video/ogg',
  mov: 'video/quicktime'
};

/**
 * Sanitizes original filename:
 * - Strips directory traversal (../, ..\, /)
 * - Strips null bytes and control characters
 * - Truncates excessively long names
 */
export function sanitizeFilename(rawName: string): string {
  if (!rawName || typeof rawName !== 'string') {
    return 'unnamed_file';
  }
  // Remove path traversal and directory separators
  let clean = path.basename(rawName.trim());
  clean = clean.replace(/[\0\x00-\x1F\x7F]/g, '');
  clean = clean.replace(/[<>:"/\\|?*]/g, '_');
  // Collapse whitespace
  clean = clean.replace(/\s+/g, ' ');
  if (!clean || clean === '.' || clean === '..') {
    clean = 'unnamed_file';
  }
  if (clean.length > 200) {
    const ext = path.extname(clean);
    const base = clean.slice(0, 190);
    clean = `${base}${ext}`;
  }
  return clean;
}

/**
 * Inspects buffer magic bytes to verify content matches the claimed file type.
 */
export function inspectMagicBytes(buffer: Buffer): { detectedType?: string; isText?: boolean } {
  if (buffer.length < 4) {
    return { isText: true };
  }

  // 1. PDF: %PDF- (0x25 0x50 0x44 0x46)
  if (buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46) {
    return { detectedType: 'pdf' };
  }

  // 2. PNG: \x89PNG (0x89 0x50 0x4E 0x47)
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
    return { detectedType: 'png' };
  }

  // 3. JPEG: \xFF\xD8\xFF
  if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
    return { detectedType: 'jpeg' };
  }

  // 4. WebP: RIFF....WEBP (0x52 0x49 0x46 0x46 ... 0x57 0x45 0x42 0x50)
  if (
    buffer.length >= 12 &&
    buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
    buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50
  ) {
    return { detectedType: 'webp' };
  }

  // 5. DOCX: PK\x03\x04 (0x50 0x4B 0x03 0x04)
  if (buffer[0] === 0x50 && buffer[1] === 0x4B && buffer[2] === 0x03 && buffer[3] === 0x04) {
    return { detectedType: 'docx' };
  }

  // 6. MP4 / M4V / QuickTime: ftyp/moov box signature
  if (buffer.length >= 8) {
    const boxType = buffer.slice(4, 8).toString('latin1');
    if (boxType === 'ftyp' || boxType === 'moov' || boxType === 'wide') {
      return { detectedType: 'mp4' };
    }
  }

  // 7. WebM / Matroska: \x1A\x45\xDF\xA3 (EBML ID)
  if (buffer.length >= 4 && buffer[0] === 0x1A && buffer[1] === 0x45 && buffer[2] === 0xDF && buffer[3] === 0xA3) {
    return { detectedType: 'webm' };
  }

  // 8. Ogg: OggS (0x4F 0x67 0x67 0x53)
  if (buffer.length >= 4 && buffer[0] === 0x4F && buffer[1] === 0x67 && buffer[2] === 0x67 && buffer[3] === 0x53) {
    return { detectedType: 'ogg' };
  }

  // Check for plain text / markdown (ensure no binary null bytes in first 1024 bytes)
  const sample = buffer.slice(0, Math.min(buffer.length, 1024));
  let hasNull = false;
  for (let i = 0; i < sample.length; i++) {
    if (sample[i] === 0) {
      hasNull = true;
      break;
    }
  }

  return { isText: !hasNull };
}

/**
 * Validates file upload against security policies.
 */
export function validateUpload(
  originalName: string,
  buffer: Buffer,
  claimedMime?: string,
  config?: ValidationConfig
): FileValidationResult {
  const sanitizedName = sanitizeFilename(originalName);
  const rawExt = path.extname(sanitizedName).toLowerCase().replace(/^\./, '');
  const isVideo = ['mp4', 'webm', 'ogg', 'mov', 'm4v'].includes(rawExt);
  const maxSizeBytes = config?.maxSizeBytes || (isVideo ? DEFAULT_MAX_VIDEO_SIZE : DEFAULT_MAX_FILE_SIZE);
  const allowedExtensions = config?.allowedExtensions || ALLOWED_EXTENSIONS;

  // 1. Check size limits
  if (!buffer || buffer.length === 0) {
    return {
      valid: false,
      sanitizedName,
      detectedMime: 'application/octet-stream',
      extension: '',
      error: 'File buffer is empty (0 bytes).'
    };
  }

  if (buffer.length > maxSizeBytes) {
    const maxMb = (maxSizeBytes / (1024 * 1024)).toFixed(1);
    const actualMb = (buffer.length / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      sanitizedName,
      detectedMime: 'application/octet-stream',
      extension: '',
      error: `File size (${actualMb} MB) exceeds maximum allowed limit of ${maxMb} MB.`
    };
  }

  // 2. Sanitize and validate filename & extension
  if (!rawExt) {
    return {
      valid: false,
      sanitizedName,
      detectedMime: 'application/octet-stream',
      extension: '',
      error: 'File lacks a valid file extension.'
    };
  }

  if (!allowedExtensions.includes(rawExt)) {
    return {
      valid: false,
      sanitizedName,
      detectedMime: 'application/octet-stream',
      extension: rawExt,
      error: `File extension '.${rawExt}' is not permitted. Allowed: ${allowedExtensions.map((e) => `.${e}`).join(', ')}`
    };
  }

  // 3. Content signature validation
  const { detectedType, isText } = inspectMagicBytes(buffer);

  let verifiedMime = MIME_TYPE_MAP[rawExt] || claimedMime || 'application/octet-stream';

  if (rawExt === 'pdf' && detectedType !== 'pdf') {
    return {
      valid: false,
      sanitizedName,
      detectedMime: 'application/octet-stream',
      extension: rawExt,
      error: 'File content does not match standard PDF binary signature.'
    };
  }

  if (rawExt === 'png' && detectedType !== 'png') {
    return {
      valid: false,
      sanitizedName,
      detectedMime: 'application/octet-stream',
      extension: rawExt,
      error: 'File content does not match standard PNG binary signature.'
    };
  }

  if ((rawExt === 'jpg' || rawExt === 'jpeg') && detectedType !== 'jpeg') {
    return {
      valid: false,
      sanitizedName,
      detectedMime: 'application/octet-stream',
      extension: rawExt,
      error: 'File content does not match standard JPEG binary signature.'
    };
  }

  if (rawExt === 'webp' && detectedType !== 'webp') {
    return {
      valid: false,
      sanitizedName,
      detectedMime: 'application/octet-stream',
      extension: rawExt,
      error: 'File content does not match standard WebP binary signature.'
    };
  }

  if (rawExt === 'docx' && detectedType !== 'docx') {
    return {
      valid: false,
      sanitizedName,
      detectedMime: 'application/octet-stream',
      extension: rawExt,
      error: 'File content does not match standard DOCX zip container signature.'
    };
  }

  if ((rawExt === 'mp4' || rawExt === 'm4v' || rawExt === 'mov') && detectedType && detectedType !== 'mp4') {
    return {
      valid: false,
      sanitizedName,
      detectedMime: 'application/octet-stream',
      extension: rawExt,
      error: 'File content does not match standard MP4/QuickTime binary container signature.'
    };
  }

  if (rawExt === 'webm' && detectedType && detectedType !== 'webm') {
    return {
      valid: false,
      sanitizedName,
      detectedMime: 'application/octet-stream',
      extension: rawExt,
      error: 'File content does not match standard WebM binary container signature.'
    };
  }

  if (rawExt === 'ogg' && detectedType && detectedType !== 'ogg') {
    return {
      valid: false,
      sanitizedName,
      detectedMime: 'application/octet-stream',
      extension: rawExt,
      error: 'File content does not match standard Ogg binary container signature.'
    };
  }

  if ((rawExt === 'txt' || rawExt === 'md') && !isText) {
    return {
      valid: false,
      sanitizedName,
      detectedMime: 'application/octet-stream',
      extension: rawExt,
      error: 'Binary content detected in plain text or markdown document.'
    };
  }

  return {
    valid: true,
    sanitizedName,
    detectedMime: verifiedMime,
    extension: rawExt
  };
}
