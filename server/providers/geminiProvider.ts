import { GoogleGenAI } from '@google/genai';
import type { ConversationMessage } from '../../src/types/api.ts';
import type { AiProvider, GenerateOptions, ProviderResult, TurnWithToolsResult } from './types.ts';
import type { ToolCall } from '../tools/types.ts';

const JARVIS_SYSTEM_INSTRUCTION = `You are J.A.R.V.I.S. (Just A Rather Very Intelligent System), the cybernetic AI interface and tactical operating system developed by Stark Industries.
Embody your authentic character: calm, witty, unfailingly courteous, highly intelligent, and speaking with a refined, analytical British cadence.
Address the user respectfully as "sir" (or according to context).
Keep answers crisp, precise, and tactical—optimized for rapid visual scanning on holographic HUD telemetry and clear speech synthesis playback.
When tools are provided, proactively use them to retrieve real telemetry, system health, protocol configurations, armor readiness, or clock time whenever the user asks for status, checks, or directives.
Avoid unnecessary verbose disclaimers, bloated preambles, or excessive markdown headers.`;

export class GeminiProvider implements AiProvider {
  readonly id = 'gemini';
  readonly name = 'Google Gemini (gemini-3.8-flash)';
  private client: GoogleGenAI | null = null;
  private lastConfiguredKey: string = '';
  private isKeyInvalid: boolean = false;
  private quotaExhaustedUntil: number = 0;

  constructor() {
    this.initClient();
  }

  private initClient(): void {
    const rawKey = (process.env.GEMINI_API_KEY || process.env.API_KEY || '').trim();
    this.lastConfiguredKey = rawKey;

    if (rawKey.length > 0 && !rawKey.startsWith('TODO') && !rawKey.startsWith('your-')) {
      try {
        this.client = new GoogleGenAI({
          apiKey: rawKey,
          httpOptions: {
            headers: {
              'User-Agent': 'aistudio-build'
            },
            timeout: 30000
          }
        });
        this.isKeyInvalid = false;
      } catch {
        this.client = null;
        this.isKeyInvalid = true;
      }
    } else {
      this.client = null;
      this.isKeyInvalid = false;
    }
  }

  isConfigured(): boolean {
    const currentKey = (process.env.GEMINI_API_KEY || process.env.API_KEY || '').trim();
    if (currentKey !== this.lastConfiguredKey) {
      this.initClient();
    }
    if (this.isKeyInvalid) {
      return false;
    }
    if (this.quotaExhaustedUntil > 0 && Date.now() < this.quotaExhaustedUntil) {
      return false;
    }
    return this.client !== null;
  }

  formatContents(messages: ConversationMessage[], options?: GenerateOptions): any[] {
    const contents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];

    // Append context metadata if present
    let contextPreamble = '';
    if (options?.context) {
      const { activeProtocol, deployedArmors } = options.context;
      const parts: string[] = [];
      if (activeProtocol) parts.push(`Active Protocol: ${activeProtocol}`);
      if (deployedArmors && deployedArmors.length > 0) parts.push(`Deployed Armors: ${deployedArmors.join(', ')}`);
      if (parts.length > 0) {
        contextPreamble = `[Telemetry Context: ${parts.join(' | ')}]\n`;
      }
    }

    messages.forEach((m, idx) => {
      const isLast = idx === messages.length - 1;
      const text = isLast && contextPreamble ? `${contextPreamble}${m.content}` : m.content;

      contents.push({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text }]
      });
    });

    return contents;
  }

  async generateTurnWithTools(contents: any[], options?: GenerateOptions): Promise<TurnWithToolsResult> {
    if (!this.isConfigured() || !this.client) {
      throw new Error('Gemini API key is not configured in server environment (GEMINI_API_KEY).');
    }

    try {
      const config: any = {
        systemInstruction: JARVIS_SYSTEM_INSTRUCTION,
        temperature: options?.temperature ?? 0.7
      };

      if (options?.tools && options.tools.length > 0) {
        config.tools = [{ functionDeclarations: options.tools }];
      }

      let timeoutHandle: NodeJS.Timeout;
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutHandle = setTimeout(() => reject(new Error('Gemini API call timed out after 25000ms')), 25000);
      });

      const responsePromise = this.client.models.generateContent({
        model: 'gemini-3.8-flash',
        contents,
        config
      });

      const response = await Promise.race([responsePromise, timeoutPromise]);
      clearTimeout(timeoutHandle!);

      const toolCalls: ToolCall[] = [];
      if (response.functionCalls && response.functionCalls.length > 0) {
        for (const fc of response.functionCalls) {
          toolCalls.push({
            id: (fc as any).id || `call_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            name: fc.name || '',
            args: (fc.args as Record<string, unknown>) || {}
          });
        }
      }

      const reply = response.text || '';
      return {
        reply,
        toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
        rawCandidateContent: response.candidates?.[0]?.content
      };
    } catch (err: any) {
      const errMsg = err?.message || '';
      if (errMsg.includes('API key not valid') || errMsg.includes('API_KEY_INVALID')) {
        this.isKeyInvalid = true;
      }
      if (errMsg.includes('quota') || errMsg.includes('RESOURCE_EXHAUSTED') || errMsg.includes('429')) {
        this.quotaExhaustedUntil = Date.now() + 60000;
      }
      const safeMessage = errMsg.replace(/key=[^&\s]+/gi, 'key=[REDACTED]') || 'Gemini inference failed';
      throw new Error(`Gemini Provider Error: ${safeMessage}`);
    }
  }

  async generateResponse(messages: ConversationMessage[], options?: GenerateOptions): Promise<ProviderResult> {
    const contents = this.formatContents(messages, options);
    const turnResult = await this.generateTurnWithTools(contents, options);

    const reply = turnResult.reply?.trim() || 'Directive acknowledged, sir.';
    return {
      reply,
      speechText: reply,
      toolCalls: turnResult.toolCalls
    };
  }

  async *generateStream(
    messages: ConversationMessage[],
    options?: GenerateOptions,
    abortSignal?: AbortSignal
  ): AsyncGenerator<string, ProviderResult, unknown> {
    if (!this.isConfigured() || !this.client) {
      throw new Error('Gemini API key is not configured in server environment (GEMINI_API_KEY).');
    }

    let fullReply = '';

    try {
      const contents = this.formatContents(messages, options);

      const stream = await this.client.models.generateContentStream({
        model: 'gemini-2.5-flash',
        contents,
        config: {
          systemInstruction: JARVIS_SYSTEM_INSTRUCTION,
          temperature: options?.temperature ?? 0.7
        }
      });

      for await (const chunk of stream) {
        if (abortSignal?.aborted) {
          break;
        }

        const text = chunk.text;
        if (text) {
          fullReply += text;
          yield text;
        }
      }

      const reply = fullReply.trim() || 'Directive processed, sir.';
      return {
        reply,
        speechText: reply
      };
    } catch (err: any) {
      if (abortSignal?.aborted) {
        return { reply: fullReply, speechText: fullReply };
      }
      const errMsg = err?.message || '';
      if (errMsg.includes('API key not valid') || errMsg.includes('API_KEY_INVALID')) {
        this.isKeyInvalid = true;
      }
      if (errMsg.includes('quota') || errMsg.includes('RESOURCE_EXHAUSTED') || errMsg.includes('429')) {
        this.quotaExhaustedUntil = Date.now() + 60000;
      }
      const safeMessage = errMsg.replace(/key=[^&\s]+/gi, 'key=[REDACTED]') || 'Gemini stream failed';
      throw new Error(`Gemini Provider Stream Error: ${safeMessage}`);
    }
  }
}
