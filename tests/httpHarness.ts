/** Deterministic HTTP harness: imports the production app without Vite or port 3000. */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import type { Server } from 'node:http';
import { signAuthPayload } from '../server/auth/tokens.ts';
import {
  jarvisData,
  getActiveRepository,
  setActiveRepository,
  resetActiveRepository,
  DiskJarvisDataRepository
} from '../server/data/index.ts';
import { app } from '../server.ts';

export async function startHttpHarness(): Promise<{ baseUrl: string; close: () => Promise<void>; tokenFor: (userId: string) => Promise<string> }> {
  // The test issuer is explicit and process-local; production still refuses an
  // absent secret.
  process.env.JARVIS_AUTH_SECRET ||= 'jarvis-http-harness-test-secret-at-least-32chars';

  const defaultDbPath = path.resolve(process.cwd(), 'data', 'jarvis-db.json');
  const currentRepoPath = (getActiveRepository() as any).getStoragePath?.();
  let harnessIsolatedDir: string | null = null;

  if (!currentRepoPath || path.resolve(currentRepoPath) === defaultDbPath) {
    harnessIsolatedDir = path.resolve(process.cwd(), 'tmp', `http-harness-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`);
    fs.mkdirSync(harnessIsolatedDir, { recursive: true });
    const isolatedDbPath = path.join(harnessIsolatedDir, 'jarvis-db.json');
    if (fs.existsSync(defaultDbPath)) {
      fs.copyFileSync(defaultDbPath, isolatedDbPath);
    }
    const isolatedRepo = new DiskJarvisDataRepository(isolatedDbPath);
    setActiveRepository(isolatedRepo);
  }

  await jarvisData.init();
  await jarvisData.seed();
  const server: Server = await new Promise((resolve) => {
    const listener = app.listen(0, '127.0.0.1', () => resolve(listener));
  });
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Harness failed to bind an ephemeral port.');
  return {
    baseUrl: `http://127.0.0.1:${address.port}`,
    tokenFor: async (userId) => {
      const user = await jarvisData.users.getById(userId);
      if (!user) throw new Error(`Unknown test actor ${userId}`);
      return signAuthPayload({
        sub: user.id,
        iat: Date.now(),
        exp: Date.now() + 3600000,
        jti: `test-jti-${Date.now()}`
      });
    },
    close: async () => {
      await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
      if (harnessIsolatedDir) {
        resetActiveRepository();
        try {
          if (fs.existsSync(harnessIsolatedDir)) {
            fs.rmSync(harnessIsolatedDir, { recursive: true, force: true });
          }
        } catch {}
      }
    }
  };
}
