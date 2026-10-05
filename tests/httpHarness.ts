/** Deterministic HTTP harness: imports the production app without Vite or port 3000. */
import type { Server } from 'node:http';
import { AuthService } from '../server/auth/tokens.ts';
import { jarvisData } from '../server/data/index.ts';
import { app } from '../server.ts';

export async function startHttpHarness(): Promise<{ baseUrl: string; close: () => Promise<void>; tokenFor: (userId: string) => Promise<string> }> {
  // The test issuer is explicit and process-local; production still refuses an
  // absent secret.
  process.env.JARVIS_AUTH_SECRET ||= 'jarvis-http-harness-test-secret';
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
      return new AuthService().issueToken(user);
    },
    close: () => new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()))
  };
}
