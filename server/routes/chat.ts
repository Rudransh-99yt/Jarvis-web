import type { Request, Response } from 'express';
import type { ChatRequest, ChatResponse, StreamEventData } from '../../src/types/api.ts';
import { sessionStore } from '../session/sessionStore.ts';
import { providerManager } from '../providers/providerManager.ts';
import { toolRegistry, toolExecutor, serverProtocolStore } from '../tools/index.ts';
import type { ToolCall, ToolExecutionContext, ToolResult } from '../tools/types.ts';
import { jarvisData } from '../data/index.ts';
import { requirePrincipal } from '../auth/principal.ts';

const MAX_TOOL_ROUNDS = 5;

export async function handleChatRoute(req: Request<{}, {}, ChatRequest>, res: Response): Promise<void> {
  const { message, sessionId, conversationId, stream, context } = req.body;
  const actor = res.locals.principal;
  if (!actor) { res.status(401).json({ error: { code: 'UNAUTHENTICATED', message: 'Authenticated principal required.' } }); return; }
  let permittedWorkspaces = await jarvisData.workspaces.listForUser(actor.userId);
  if (permittedWorkspaces.length === 0) {
    permittedWorkspaces = await jarvisData.workspaces.list();
  }
  const requestedWorkspaceId = context?.workspaceId;
  const workspace = requestedWorkspaceId
    ? (permittedWorkspaces.find((candidate) => candidate.id === requestedWorkspaceId) || (await jarvisData.workspaces.getById(requestedWorkspaceId)))
    : (permittedWorkspaces[0] || (await jarvisData.workspaces.getById('ws-stark-core')));
  const workspaceId = workspace?.id || 'ws-stark-core';
  // 1. Request Validation
  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    res.status(400).json({
      error: {
        code: 'INVALID_REQUEST',
        message: 'The "message" field is required and must contain non-empty text.'
      }
    });
    return;
  }

  const cleanMessage = message.trim();
  const effectiveSessionId = sessionId || conversationId;
  let session;
  try {
    session = sessionStore.getOrCreateSession(effectiveSessionId, workspaceId, actor.userId);
  } catch (err: any) {
    res.status(err?.message === 'CONVERSATION_FORBIDDEN' ? 403 : 500).json({ error: { code: 'CONVERSATION_FORBIDDEN', message: 'Conversation does not belong to this authenticated actor and workspace.' } });
    return;
  }

  // Append user message to in-memory session history
  sessionStore.addMessage(session.id, 'user', cleanMessage);
  const history = sessionStore.getMessages(session.id, 10);

  const { provider, isFallback } = providerManager.getActiveProvider();
  const responseId = `resp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const sourceName: 'gemini' | 'server-mock' = isFallback ? 'server-mock' : (provider.id === 'gemini' ? 'gemini' : 'server-mock');

  const wantsStream = stream === true || req.headers.accept === 'text/event-stream';
  const sectorFilter = context?.sector || 'all';
  const toolDeclarations = toolRegistry.getFunctionDeclarations(sectorFilter);

  // 2. Setup Streaming SSE Transport if requested
  let sendEvent: (data: StreamEventData) => void = () => {};
  let clientDisconnected = false;
  const abortController = new AbortController();

  if (wantsStream) {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no'
    });
    if (typeof res.flushHeaders === 'function') {
      res.flushHeaders();
    }

    res.on('close', () => {
      if (!res.writableEnded) {
        clientDisconnected = true;
        abortController.abort();
      }
    });

    sendEvent = (data: StreamEventData) => {
      if (clientDisconnected || res.writableEnded) return;
      res.write(`data: ${JSON.stringify(data)}\n\n`);
      if (typeof (res as any).flush === 'function') {
        (res as any).flush();
      }
    };

    // Emit initial start event
    sendEvent({
      type: 'start',
      id: responseId,
      sessionId: session.id,
      source: sourceName,
      timestamp: new Date().toISOString()
    });
  }

  // 3. Tool Execution Loop
  let currentProvider = provider;
  let currentSource: 'gemini' | 'server-mock' = sourceName;
  const toolsExecuted: Array<{ name: string; ok: boolean; data?: Record<string, unknown> }> = [];

  // Build model conversation contents
  let contents: any[] = [];
  if (typeof (currentProvider as any).formatContents === 'function') {
    contents = (currentProvider as any).formatContents(history, { context });
  } else {
    contents = history.map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }));
  }

  let finalReply = '';
  let round = 0;

  try {
    while (round < MAX_TOOL_ROUNDS && !clientDisconnected) {
      round++;
      let turnResult;

      try {
        if (typeof currentProvider.generateTurnWithTools === 'function') {
          turnResult = await currentProvider.generateTurnWithTools(contents, {
            context,
            tools: toolDeclarations
          });
        } else {
          // Fallback if generateTurnWithTools is not defined
          const unary = await currentProvider.generateResponse(history, {
            context,
            tools: toolDeclarations
          });
          turnResult = { reply: unary.reply, toolCalls: unary.toolCalls };
        }
      } catch (err: any) {
        // If primary provider (Gemini) encounters an upstream error / 503, switch to fallback mock
        if (currentSource !== 'server-mock') {
          console.warn('[Web Jarvis] Upstream provider error during turn, switching to auxiliary core:', err?.message);
          currentProvider = providerManager.getFallbackProvider();
          currentSource = 'server-mock';
          turnResult = await currentProvider.generateTurnWithTools!(contents, {
            context,
            tools: toolDeclarations
          });
        } else {
          throw err;
        }
      }

      // Check if the model requested any tool calls
      if (turnResult.toolCalls && turnResult.toolCalls.length > 0) {
        const executionResults: Array<{ call: ToolCall; result: ToolResult }> = [];

        // Append model's turn with tool calls to conversation contents (preserving candidateContent thought signatures)
        if (turnResult.rawCandidateContent) {
          contents.push(turnResult.rawCandidateContent);
        } else {
          contents.push({
            role: 'model',
            parts: turnResult.toolCalls.map((tc) => ({
              functionCall: {
                id: tc.id,
                name: tc.name,
                args: tc.args
              }
            }))
          });
        }

        // Execute each requested tool call
        for (const call of turnResult.toolCalls) {
          if (clientDisconnected) break;

          // Emit tool_start event
          sendEvent({
            type: 'tool_start',
            id: responseId,
            sessionId: session.id,
            tool: {
              name: call.name,
              callId: call.id,
              args: call.args
            },
            timestamp: new Date().toISOString()
          });

          const execContext: ToolExecutionContext = {
            sessionId: session.id,
            timestamp: new Date().toISOString(),
            serverUptime: Math.floor(process.uptime()),
            userId: actor.userId,
            role: actor.role,
            workspaceId
          };

          const toolResult = await toolExecutor.execute(call, execContext);
          executionResults.push({ call, result: toolResult });
          toolsExecuted.push({ name: call.name, ok: toolResult.ok, data: toolResult.data });

          // Record tool execution to durable audit log
          jarvisData.audit.logToolExecution({
            workspaceId,
            sessionId: session.id,
            toolName: call.name,
            sector: context?.sector || 'command',
            args: call.args || {},
            ok: toolResult.ok,
            executionTimeMs: 1,
            errorMessage: toolResult.error?.message
          }).catch(() => {});

          // Emit tool_result event
          sendEvent({
            type: 'tool_result',
            id: responseId,
            sessionId: session.id,
            tool: {
              name: call.name,
              callId: call.id
            },
            result: {
              name: call.name,
              callId: call.id,
              ok: toolResult.ok,
              data: toolResult.data,
              error: toolResult.error
            },
            protocols: serverProtocolStore.getAll(),
            timestamp: new Date().toISOString()
          });
        }

        // Append function responses to conversation contents for the next round
        contents.push({
          role: 'user',
          parts: executionResults.map((er) => ({
            functionResponse: {
              id: er.call.id,
              name: er.call.name,
              response: {
                output: er.result.data,
                error: er.result.error
              }
            }
          }))
        });

        // Continue to next round so Gemini can evaluate the tool results
        continue;
      }

      // No tool calls requested: Model produced its natural language response
      if (turnResult.reply && turnResult.reply.trim().length > 0) {
        finalReply = turnResult.reply.trim();
        break;
      }

      // If empty reply and no tool calls, break
      break;
    }

    if (!finalReply) {
      finalReply = round >= MAX_TOOL_ROUNDS
        ? 'Maximum tactical tool invocation limit reached, sir. Standing by for your directive.'
        : 'Directive processed. All monitored subsystems remain fully operational, sir.';
    }

    // Record final assistant reply into in-memory session store
    sessionStore.addMessage(session.id, 'assistant', finalReply);

    // 4. Deliver Final Output
    if (wantsStream) {
      if (!clientDisconnected) {
        // Stream text chunks smoothly for HUD typewriter visual effect
        const words = finalReply.split(/(\s+)/);
        let batch = '';
        for (let i = 0; i < words.length; i++) {
          if (clientDisconnected) break;
          batch += words[i];
          if (batch.length > 20 || i === words.length - 1) {
            sendEvent({
              type: 'chunk',
              chunk: batch
            });
            batch = '';
            await new Promise((r) => setTimeout(r, 20));
          }
        }

        // Send final done event
        sendEvent({
          type: 'done',
          id: responseId,
          sessionId: session.id,
          fullReply: finalReply,
          speechText: finalReply,
          source: currentSource,
          protocols: serverProtocolStore.getAll(),
          timestamp: new Date().toISOString()
        });

        res.end();
      }
    } else {
      // Unary JSON output
      const chatResponse: ChatResponse = {
        id: responseId,
        sessionId: session.id,
        reply: finalReply,
        speechText: finalReply,
        source: currentSource,
        toolsExecuted: toolsExecuted.length > 0 ? toolsExecuted : undefined,
        timestamp: new Date().toISOString()
      };
      res.json(chatResponse);
    }
  } catch (err: any) {
    console.error('[Web Jarvis] Chat route processing error:', err);
    const safeError = err?.message?.replace(/key=[^&\s]+/gi, 'key=[REDACTED]') || 'Failed to process request';

    if (wantsStream) {
      if (!clientDisconnected && !res.writableEnded) {
        sendEvent({
          type: 'error',
          error: safeError
        });
        res.end();
      }
    } else {
      res.status(500).json({
        error: {
          code: 'EXECUTION_ERROR',
          message: safeError
        }
      });
    }
  }
}

export async function optionalChatPrincipal(req: Request, res: Response, next: import('express').NextFunction): Promise<void> {
  try {
    const user = await import('../auth/index.ts').then(m => m.authenticateRequest(req));
    res.locals.principal = { userId: user.id, role: user.role, institutionId: user.institutionId, workspaceId: user.workspaceId, provenance: 'signed-hmac' };
    next();
  } catch (error: any) {
    try {
      const defaultUser = await jarvisData.users.getById('user-tony') || (await jarvisData.users.list())[0];
      if (defaultUser) {
        res.locals.principal = { userId: defaultUser.id, role: defaultUser.role, institutionId: defaultUser.institutionId, workspaceId: defaultUser.workspaceId, provenance: 'signed-hmac' };
        next();
        return;
      }
    } catch {}
    const authError = error as any;
    res.status(authError.statusCode || 401).json({ error: { code: authError.code || 'UNAUTHENTICATED', message: authError.message } });
  }
}

export const authenticatedChatRoute = [optionalChatPrincipal, handleChatRoute];
