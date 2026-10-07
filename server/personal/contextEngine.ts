import { personalIdentityStore } from './identityStore.ts';
import type { UserContext, UserContextType } from './types.ts';

/**
 * ContextEngine
 * Coordinates multi-context awareness and context transitions for a single personal identity.
 */
export class ContextEngine {
  async getContexts(userId: string): Promise<UserContext[]> {
    const identity = await personalIdentityStore.getIdentity(userId);
    return identity.contexts;
  }

  async getActiveContext(userId: string): Promise<UserContext> {
    const identity = await personalIdentityStore.getIdentity(userId);
    const active = identity.contexts.find((c) => c.id === identity.activeContextId) || identity.contexts[0];
    return active;
  }

  async switchContext(userId: string, contextId: string): Promise<UserContext> {
    const identity = await personalIdentityStore.getIdentity(userId);
    const target = identity.contexts.find((c) => c.id === contextId);
    if (!target) {
      throw new Error(`Context ${contextId} not found for user ${userId}`);
    }

    const updatedContexts = identity.contexts.map((c) => ({
      ...c,
      isActive: c.id === contextId
    }));

    await personalIdentityStore.updateIdentity(userId, {
      activeContextId: contextId,
      contexts: updatedContexts
    });

    return { ...target, isActive: true };
  }

  async createContext(
    userId: string,
    params: {
      type: UserContextType;
      title: string;
      description: string;
      metadata?: Record<string, any>;
      permissions?: { canAccessInstitutionData: boolean; sharePersonalMemory: boolean };
    }
  ): Promise<UserContext> {
    const identity = await personalIdentityStore.getIdentity(userId);
    const newContext: UserContext = {
      id: `ctx-${userId}-${Date.now().toString(36)}`,
      type: params.type,
      title: params.title,
      description: params.description,
      isDefault: false,
      isActive: false,
      metadata: params.metadata || {},
      permissions: params.permissions || {
        canAccessInstitutionData: false,
        sharePersonalMemory: false
      },
      createdAt: new Date().toISOString()
    };

    const contexts = [...identity.contexts, newContext];
    await personalIdentityStore.updateIdentity(userId, { contexts });
    return newContext;
  }
}

export const contextEngine = new ContextEngine();
