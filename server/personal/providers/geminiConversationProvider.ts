import { GoogleGenAI } from '@google/genai';
import { contextOrchestrator } from '../contextOrchestrator.ts';
import { personalToolRegistry } from '../tools/index.ts';
import type {
  IConversationProvider,
  BoundedConversationPrompt,
  ConversationGenerationOptions,
  ConversationTurnResult
} from '../types.ts';

/**
 * GeminiConversationProvider
 * Real AI conversation provider using @google/genai SDK (gemini-3.8-flash) on the server.
 * Feeds structured bounded personal context, preferences, memories, and provenance constraints.
 */
export class GeminiConversationProvider implements IConversationProvider {
  readonly id = 'gemini';
  readonly name = 'Gemini 3.8 Flash (Neural Core)';
  private ai: GoogleGenAI | null = null;
  private consecutiveFailures: number = 0;
  private backoffUntil: number = 0;

  constructor() {
    this.initClient();
  }

  private initClient(): void {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      this.ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build'
          }
        }
      });
    }
  }

  async isAvailable(): Promise<boolean> {
    if (Date.now() < this.backoffUntil) {
      return false;
    }
    if (!this.ai) {
      this.initClient();
    }
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey.trim().length === 0) {
      return false;
    }
    return Boolean(this.ai);
  }

  async generateConversationTurn(
    prompt: BoundedConversationPrompt,
    options?: ConversationGenerationOptions
  ): Promise<ConversationTurnResult> {
    if (!this.ai) {
      this.initClient();
    }

    if (!this.ai || !process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not configured on server.');
    }

    const systemInstruction = `You are J.A.R.V.I.S., a sophisticated personal operating assistant.
The user is ${prompt.identitySummary.displayName} (prefers to be called ${prompt.identitySummary.preferredName}).
Active Context: ${prompt.activeContext.title} (${prompt.activeContext.type}).
Explanation Style: ${prompt.preferences.explanationStyle}.
Tone: ${prompt.preferences.tone}.

Guidelines:
- Speak intelligently, calmly, concisely, and naturally.
- Follow the user's explanation preference (${prompt.preferences.explanationStyle}).
- Use relevant memories and verified concept knowledge when provided in the context.
- Never invent ungrounded facts or claim you know things you do not.
- Never confuse personal memory with institution shared data.
- Avoid generic canned AI phrases ("As an AI language model...", "I hope this helps!").`;

    // Construct prompt payload with bounded memories, knowledge, and conversation history
    let contextBlock = `[JARVIS BOUNDED CONTEXT]\n`;
    contextBlock += `User: ${prompt.identitySummary.displayName}\n`;
    contextBlock += `Active Context: ${prompt.activeContext.title} (${prompt.activeContext.type})\n`;
    
    if (prompt.relevantMemories.length > 0) {
      contextBlock += `\nRelevant Memories:\n` +
        prompt.relevantMemories.map((m) => `- [${m.category}] ${m.key}: ${JSON.stringify(m.value)} (Source: ${m.source})`).join('\n') + `\n`;
    }

    if (prompt.relevantKnowledge.length > 0) {
      contextBlock += `\nRelevant Concept Knowledge:\n` +
        prompt.relevantKnowledge.map((k) => `- ${k.conceptName} (${k.subject}): ${Math.round(k.masteryLevel * 100)}% mastery [${k.status}]`).join('\n') + `\n`;
    }

    if (prompt.nextBestAction) {
      contextBlock += `\nNext Recommended Action: ${prompt.nextBestAction.title} - ${prompt.nextBestAction.rationale}\n`;
    }

    if (prompt.webSearchResults && prompt.webSearchResults.length > 0) {
      contextBlock += `\nVerified External Web References:\n` +
        prompt.webSearchResults.map((r) => `- [${r.sourceAttribution}] ${r.title}: ${r.snippet}`).join('\n') + `\n`;
    }

    const contents: any[] = [];
    
    // Append conversation history
    for (const msg of prompt.recentMessages) {
      contents.push({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }]
      });
    }

    // Append current prompt turn
    const userTurnContent = `${contextBlock}\n\nUser Request: ${prompt.currentMessage}`;
    contents.push({
      role: 'user',
      parts: [{ text: userTurnContent }]
    });

    const modelName = options?.modelOverride || 'gemini-3.8-flash';
    const timeoutMs = options?.timeoutMs || 8000;
    
    let timeoutHandle: NodeJS.Timeout | undefined;
    const timeout = new Promise<never>((_, reject) => {
      timeoutHandle = setTimeout(() => reject(new Error(`Gemini API call timed out after ${timeoutMs}ms`)), timeoutMs);
    });

    try {
      const toolDeclarations = personalToolRegistry.getFunctionDeclarations(prompt.activeContext.type);

      const apiCall = this.ai.models.generateContent({
        model: modelName,
        contents,
        config: {
          systemInstruction,
          temperature: options?.temperature ?? 0.7,
          tools: toolDeclarations.length > 0 ? [{ functionDeclarations: toolDeclarations as any }] : undefined
        }
      });

      const response = await Promise.race([apiCall, timeout]);
      const reply = response.text || 'Directive acknowledged, sir.';

      // Reset failure state on success
      this.consecutiveFailures = 0;
      this.backoffUntil = 0;

      // Extract explicit memories for selective write-back
      const memoriesToWrite = contextOrchestrator.extractExplicitMemories(prompt.currentMessage);

      // Extract function call proposals from Gemini model
      let toolCalls: Array<{ name: string; args: Record<string, any> }> | undefined;
      const rawFunctionCalls = (response as any).functionCalls;
      if (typeof rawFunctionCalls === 'function') {
        const calls = rawFunctionCalls.call(response);
        if (Array.isArray(calls) && calls.length > 0) {
          toolCalls = calls.map((fc: any) => ({ name: fc.name, args: fc.args || {} }));
        }
      } else if (Array.isArray(rawFunctionCalls) && rawFunctionCalls.length > 0) {
        toolCalls = rawFunctionCalls.map((fc: any) => ({ name: fc.name, args: fc.args || {} }));
      }

      // Extract suggested next actions
      const suggestedNextActions: string[] = [];
      if (prompt.nextBestAction) {
        suggestedNextActions.push(prompt.nextBestAction.title);
      }

      return {
        reply,
        providerId: this.id,
        suggestedNextActions: suggestedNextActions.length > 0 ? suggestedNextActions : undefined,
        memoriesToWrite,
        toolCalls,
        searchPerformed: Boolean(prompt.webSearchResults && prompt.webSearchResults.length > 0),
        searchAttributions: prompt.webSearchResults
      };
    } catch (err: any) {
      this.consecutiveFailures++;
      // Back off for 30 seconds if consecutive failures occur or rate limited
      const isRateLimit = err?.message?.includes('429') || err?.message?.includes('RESOURCE_EXHAUSTED') || err?.status === 429;
      const backoffDuration = isRateLimit ? 60000 : 30000;
      this.backoffUntil = Date.now() + backoffDuration;
      console.warn(`[GeminiConversationProvider] Provider error (${err?.message || 'unknown'}). Backing off for ${backoffDuration / 1000}s.`);
      throw err;
    } finally {
      if (timeoutHandle) clearTimeout(timeoutHandle);
    }
  }
}
