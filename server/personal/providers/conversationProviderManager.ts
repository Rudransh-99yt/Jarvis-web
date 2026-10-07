import type { IConversationProvider } from '../types.ts';
import { GeminiConversationProvider } from './geminiConversationProvider.ts';
import { DeterministicMockConversationProvider } from './mockConversationProvider.ts';

/**
 * ConversationProviderManager
 * Coordinates AI conversation providers with automatic fallback to deterministic reasoning core.
 */
export class ConversationProviderManager {
  private providers: Map<string, IConversationProvider> = new Map();
  private defaultProviderId: string = 'gemini';
  private fallbackProvider: IConversationProvider = new DeterministicMockConversationProvider();

  constructor() {
    this.registerProvider(new GeminiConversationProvider());
    this.registerProvider(this.fallbackProvider);
  }

  registerProvider(provider: IConversationProvider): void {
    this.providers.set(provider.id, provider);
  }

  getProvider(id: string): IConversationProvider | undefined {
    return this.providers.get(id);
  }

  getFallbackProvider(): IConversationProvider {
    return this.fallbackProvider;
  }

  async getActiveProvider(): Promise<{ provider: IConversationProvider; isFallback: boolean }> {
    const primary = this.providers.get(this.defaultProviderId);
    if (primary && (await primary.isAvailable())) {
      return { provider: primary, isFallback: false };
    }
    return { provider: this.fallbackProvider, isFallback: true };
  }

  async getProviderStatus(): Promise<Array<{ id: string; name: string; available: boolean }>> {
    const list: Array<{ id: string; name: string; available: boolean }> = [];
    for (const prov of this.providers.values()) {
      list.push({
        id: prov.id,
        name: prov.name,
        available: await prov.isAvailable()
      });
    }
    return list;
  }
}

export const conversationProviderManager = new ConversationProviderManager();
