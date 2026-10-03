import express, { Request, Response } from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { HealthResponse } from './src/types/api.ts';
import { handleChatRoute } from './server/routes/chat.ts';
import { providerManager } from './server/providers/providerManager.ts';
import { toolRegistry, serverProtocolStore } from './server/tools/index.ts';
import { educationRouter } from './server/sectors/education/routes.ts';
import { workspaceRouter } from './server/routes/workspaceRoutes.ts';
import { conversationRouter } from './server/routes/conversationRoutes.ts';
import { knowledgeRouter } from './server/routes/knowledgeRoutes.ts';
import { jarvisData } from './server/data/index.ts';

const app = express();
const PORT = 3000;
const HOST = '0.0.0.0';
const startTime = Date.now();

// Server-side JSON parsing
app.use(express.json());

// Health Check Endpoint
app.get(['/api/health', '/api/system/health'], (_req: Request, res: Response) => {
  const uptimeSeconds = Math.floor((Date.now() - startTime) / 1000);
  const { provider, isFallback } = providerManager.getActiveProvider();

  const healthData: HealthResponse & {
    tools: { count: number; registered: string[] };
    persistence: { driver: string; persistent: boolean; path?: string };
  } = {
    status: 'healthy',
    version: '1.4.0',
    service: 'web-jarvis-api',
    uptimeSeconds,
    timestamp: new Date().toISOString(),
    provider: {
      name: provider.name,
      available: !isFallback
    },
    sectors: {
      active: ['command', 'education'],
      available: ['command', 'education', 'research', 'finance', 'home']
    },
    tools: {
      count: toolRegistry.list().length,
      registered: toolRegistry.list().map((t) => t.name)
    },
    persistence: {
      driver: 'json-file-store',
      persistent: jarvisData.isPersistent,
      path: jarvisData.storagePath
    }
  };
  res.json(healthData);
});

// Core Platform REST Routes
app.use('/api/workspaces', workspaceRouter);
app.use('/api/conversations', conversationRouter);
app.use('/api/knowledge-spaces', knowledgeRouter);

// Sector REST Router: Education
app.use('/api/education', educationRouter);

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
app.post('/api/chat', handleChatRoute);

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
      server: { middlewareMode: true, host: HOST, port: PORT },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, HOST, () => {
    console.log(`[Web Jarvis] Server listening on http://${HOST}:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[Web Jarvis] Failed to start server:', err);
  process.exit(1);
});
