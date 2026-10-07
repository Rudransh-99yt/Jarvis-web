import type {
  ToolRiskLevel,
  PendingConfirmationAction
} from './types.ts';

/**
 * ConfirmationPolicy
 * Deterministic security policy engine governing tool execution confirmation requirements.
 * Invariant: The LLM NEVER decides risk or confirmation requirements. The deterministic policy is absolute.
 */
export class ConfirmationPolicy {
  private pendingActions: Map<string, PendingConfirmationAction> = new Map();
  private readonly DEFAULT_EXPIRATION_MS = 5 * 60 * 1000; // 5 minutes

  /**
   * Deterministically evaluates whether a tool requires confirmation based on risk classification.
   */
  evaluateConfirmationRequirement(riskLevel: ToolRiskLevel, _explicitUserRequest: boolean = true): boolean {
    switch (riskLevel) {
      case 'READ_ONLY':
        return false;
      case 'LOW_RISK_WRITE':
        return false;
      case 'HIGH_RISK_WRITE':
        return true;
      case 'EXTERNAL_ACTION':
        return true;
      default:
        return true;
    }
  }

  /**
   * Creates and registers a pending action requiring confirmation.
   */
  createPendingAction(input: {
    toolId: string;
    userId: string;
    contextId: string;
    arguments: Record<string, any>;
    riskLevel: ToolRiskLevel;
    previewSummary: string;
  }): PendingConfirmationAction {
    this.cleanupExpired();

    // Cancel any previous unconfirmed pending action for this user
    for (const [id, act] of this.pendingActions.entries()) {
      if (act.userId === input.userId) {
        this.pendingActions.delete(id);
      }
    }

    const id = `act-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const pending: PendingConfirmationAction = {
      id,
      toolId: input.toolId,
      userId: input.userId,
      contextId: input.contextId,
      arguments: input.arguments,
      riskLevel: input.riskLevel,
      previewSummary: input.previewSummary,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + this.DEFAULT_EXPIRATION_MS).toISOString()
    };

    this.pendingActions.set(id, pending);
    return pending;
  }

  getPendingAction(id: string): PendingConfirmationAction | null {
    this.cleanupExpired();
    return this.pendingActions.get(id) || null;
  }

  /**
   * Consumes and removes a pending action upon authorized confirmation.
   */
  consumePendingAction(id: string, userId: string): PendingConfirmationAction | null {
    this.cleanupExpired();
    const action = this.pendingActions.get(id);
    if (!action) return null;

    if (action.userId !== userId) {
      throw new Error('SECURITY_VIOLATION: Pending action does not belong to this authenticated user.');
    }

    this.pendingActions.delete(id);
    return action;
  }

  findPendingActionForUser(userId: string): PendingConfirmationAction | null {
    this.cleanupExpired();
    for (const action of this.pendingActions.values()) {
      if (action.userId === userId) {
        return action;
      }
    }
    return null;
  }

  private cleanupExpired(): void {
    const now = Date.now();
    for (const [id, action] of this.pendingActions.entries()) {
      if (new Date(action.expiresAt).getTime() < now) {
        this.pendingActions.delete(id);
      }
    }
  }
}

export const confirmationPolicy = new ConfirmationPolicy();
