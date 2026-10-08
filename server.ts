import express, { type Request, type Response } from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { HealthResponse } from './src/types/api.ts';
import { authenticatedChatRoute } from './server/routes/chat.ts';
import { providerManager } from './server/providers/providerManager.ts';
import { toolRegistry, serverProtocolStore } from './server/tools/index.ts';
import { educationRouter } from './server/sectors/education/routes.ts';
import { researchRouter } from './server/sectors/research/routes.ts';
import { workspaceRouter } from './server/routes/workspaceRoutes.ts';
import { conversationRouter } from './server/routes/conversationRoutes.ts';
import { knowledgeRouter } from './server/routes/knowledgeRoutes.ts';
import { filesRouter } from './server/routes/files.ts';
import { messagingRouter } from './server/routes/messagingRoutes.ts';
import { classroomRouter } from './server/sectors/education/classroomRoutes.ts';
import { quizRouter } from './server/sectors/education/quizRoutes.ts';
import { storageManager } from './server/storage/index.ts';
import { jarvisData } from './server/data/index.ts';
import { personalRouter } from './server/personal/personalRoutes.ts';
import { authRouter } from './server/auth/index.ts';
import { correlationMiddleware } from './server/logging/logger.ts';
import { corsAndSecurityHeaders } from './server/security/corsAndHeaders.ts';
import { getProductionDiagnostics } from './server/diagnostics/productionHealth.ts';
import { productionErrorHandler } from './server/middleware/errorHandler.ts';

function getArg(flag: string): string | undefined {
  const idx = process.argv.indexOf(flag);
  if (idx !== -1 && idx < process.argv.length - 1) {
    return process.argv[idx + 1];
  }
  return undefined;
}

export const app = express();
// AI Studio dev environment requires port 3000. In production containers (e.g. Cloud Run), allow process.env.PORT.
const PORT = parseInt(
  getArg('--port') || 
  (process.env.NODE_ENV === 'production' && process.env.PORT ? process.env.PORT : undefined) || 
  '3000', 
  10
);
const HOST = getArg('--host') || process.env.HOST || '0.0.0.0';
const startTime = Date.now();

// 1. Production Correlation & Logging Middleware
app.use(correlationMiddleware);

// 2. Production Security Headers & CORS Policy
app.use(corsAndSecurityHeaders);

// Server-side parsing with support for large file payloads (Milestone 10)
app.use(express.json({ limit: '50mb' }));
app.use(express.raw({ limit: '50mb', type: ['application/octet-stream', 'application/pdf', 'image/*'] }));

// Production Health & Diagnostics Endpoint
app.get(['/api/health', '/api/system/health'], async (_req: Request, res: Response) => {
  const diagnostics = await getProductionDiagnostics(startTime);
  const httpCode = diagnostics.status === 'unhealthy' ? 503 : 200;
  res.status(httpCode).json(diagnostics);
});

// Core Platform REST Routes
app.use('/api/auth', authRouter);
app.use('/api/workspaces', workspaceRouter);
app.use('/api/conversations', conversationRouter);
app.use('/api/knowledge-spaces', knowledgeRouter);
app.use('/api/files', filesRouter);
app.use('/api/messages', messagingRouter);
app.use('/api/classroom/sessions', classroomRouter);
app.use('/api/classroom/quizzes', quizRouter);

// Sector REST Routers
app.use('/api/personal', personalRouter);
app.use('/api/education', educationRouter);
app.use('/api/research', researchRouter);

// Server-authoritative Protocols Endpoint
app.get('/api/protocols', (_req: Request, res: Response) => {
  res.json({
    protocols: serverProtocolStore.getAll(),
    activeCount: serverProtocolStore.getActiveProtocols().length,
    timestamp: new Date().toISOString()
  });
});

// Tools Listing Endpoint (with optional sector filter)
app.get('/api/tools', (req: Request, res: Response) => {
  const sector = typeof req.query.sector === 'string' ? req.query.sector : undefined;
  const tools = toolRegistry.list(sector);
  res.json({
    tools: tools.map((t) => ({
      name: t.name,
      sector: t.sector || 'system',
      aliases: t.aliases || [],
      description: t.description,
      declaration: t.declaration
    })),
    count: tools.length,
    filteredSector: sector || 'all',
    timestamp: new Date().toISOString()
  });
});

// Primary Chat Route (Streaming SSE or Unary JSON with Tool Loop)
app.post('/api/chat', ...authenticatedChatRoute);

// 3. Centralized Production Error Handling for API routes
app.use(productionErrorHandler);

// Frontend Vite Integration: Middleware mode in development, static bundle in production
async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  // Initialize and verify core persistent storage
  try {
    await jarvisData.init();
    await jarvisData.seed();
    console.log(`[Web Jarvis] Core persistence initialized at: ${jarvisData.storagePath || 'in-memory'}`);
  } catch (err) {
    console.error('[Web Jarvis] Error initializing data repository:', err);
  }

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('{*splat}', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, HOST, () => {
    console.log(`[Web Jarvis] Server listening on http://${HOST}:${PORT}`);
  });
}

// Importing the app must not bind a port: deterministic tests use the same
// configured production router with an ephemeral listener.
if (process.argv[1]?.endsWith('server.ts') || process.argv[1]?.endsWith('server.js')) {
  startServer().catch((err) => {
    console.error('[Web Jarvis] Failed to start server:', err);
    process.exit(1);
  });
}
