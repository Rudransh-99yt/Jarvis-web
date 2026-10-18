// Operator Internal Export API Routes (Stage 6.4.4.16)
import { Router, type Request, type Response, type NextFunction } from 'express';
import { requirePrincipal, type AuthenticatedPrincipal } from '../auth/principal.ts';
import { hasCapability } from '../auth/capabilities.ts';
import { jarvisData } from '../data/index.ts';
import {
  streamDatabaseExport,
  takeImmutableSnapshot,
  generateStorageManifest,
  getStorageObjectStream,
  verifyOperatorSecret,
  ExportPayloadLimitExceededError
} from './exportService.ts';

export const exportRouter = Router();

/**
 * 1. Primary Authentication: Signed Bearer token via requirePrincipal.
 */
export const requireOperatorAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  requirePrincipal(req, res, () => {
    const actor = res.locals.principal as AuthenticatedPrincipal | undefined;
    if (!actor) {
      res.status(401).json({ error: { code: 'UNAUTHENTICATED', message: 'Authentication required.' } });
      return;
    }

    // Role verification: strictly elevated roles only
    if (actor.role !== 'admin' && actor.role !== 'commander') {
      res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: `Access denied: Role '${actor.role}' lacks administrative migration privileges.`
        }
      });
      return;
    }

    // Capability verification: strictly require admin.system.manage capability
    if (!hasCapability({ role: actor.role } as any, 'admin.system.manage')) {
      res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: `Access denied: Principal lacks required capability 'admin.system.manage'.`
        }
      });
      return;
    }

    // Secondary Operator Gate: Constant-time secret verification
    const headerSecret = (req.headers['x-operator-secret'] || req.headers['x-internal-export-secret']) as string | undefined;
    const verification = verifyOperatorSecret(headerSecret);
    if (!verification.valid) {
      res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: verification.reason || 'Operator secret verification failed.'
        }
      });
      return;
    }

    next();
  });
};

exportRouter.use(requireOperatorAuth);

/**
 * GET /api/internal/export/stream
 * Streams complete DatabaseSchema across all 45 collections with record counts and checksums.
 */
exportRouter.get('/stream', async (req: Request, res: Response) => {
  try {
    const maxBytes = req.query.maxBytes ? parseInt(req.query.maxBytes as string, 10) : undefined;

    // Snapshot consistency: Acquire immutable point-in-time state
    // Concurrent writes happening during the stream will not tear or mutate this snapshot
    const currentDatabaseState = jarvisData.getState();
    const snapshot = takeImmutableSnapshot(currentDatabaseState);

    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Transfer-Encoding', 'chunked');
    res.setHeader('X-Export-Schema-Version', String(snapshot.version || 2));

    await streamDatabaseExport(snapshot, res, { maxBytes });
    if (!res.writableEnded) {
      res.end();
    }
  } catch (err: any) {
    if (err instanceof ExportPayloadLimitExceededError) {
      if (!res.headersSent) {
        res.status(413).json({ error: { code: 'PAYLOAD_TOO_LARGE', message: err.message } });
      } else {
        res.destroy(err);
      }
      return;
    }

    if (!res.headersSent) {
      res.status(500).json({ error: { code: 'EXPORT_FAILED', message: err?.message || 'Database export failed.' } });
    } else {
      res.destroy(err);
    }
  }
});

/**
 * GET /api/internal/export/storage-manifest
 * Generates and returns a complete manifest of data/storage/objects/ with SHA-256 checksums and file associations.
 */
exportRouter.get('/storage-manifest', async (_req: Request, res: Response) => {
  try {
    const knownFiles = await jarvisData.files.list();
    const manifest = await generateStorageManifest(undefined, knownFiles);
    res.json(manifest);
  } catch (err: any) {
    res.status(500).json({ error: { code: 'MANIFEST_FAILED', message: err?.message || 'Failed to generate storage manifest.' } });
  }
});

/**
 * GET /api/internal/export/storage-objects/:storageKey
 * Streams a specific binary storage object with path traversal protection and content headers.
 */
exportRouter.get('/storage-objects/:storageKey', async (req: Request, res: Response) => {
  try {
    const paramVal = req.params.storageKey;
    const storageKey = Array.isArray(paramVal) ? paramVal[0] : paramVal;
    if (!storageKey) {
      res.status(400).json({ error: { code: 'INVALID_KEY', message: 'Missing storageKey parameter' } });
      return;
    }
    const { stream, sizeBytes, sha256, mimeType } = await getStorageObjectStream(storageKey);

    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Length', String(sizeBytes));
    res.setHeader('X-SHA256-Checksum', sha256);
    res.setHeader('Content-Disposition', `attachment; filename="${storageKey}"`);

    stream.pipe(res);
  } catch (err: any) {
    const isNotFound = err?.message?.includes('not found');
    res.status(isNotFound ? 404 : 400).json({ error: { code: isNotFound ? 'NOT_FOUND' : 'INVALID_KEY', message: err.message } });
  }
});
