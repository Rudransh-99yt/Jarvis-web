import type { ResponseEvent } from '../../../../src/types/classroomResponse.ts';

export type ResponseEventHandler = (event: ResponseEvent) => Promise<void> | void;

/**
 * ClassroomResponseProvider
 *
 * Provider-neutral interface for ingesting response telemetry into Jarvis Education.
 * Future physical adapters (e.g. RF USB dongles, Bluetooth BLE hubs, WebSockets)
 * implement this exact contract without modifying core session architecture.
 */
export interface ClassroomResponseProvider {
  readonly id: string;
  readonly name: string;
  readonly description?: string;

  /**
   * Dispatches an incoming response event into the session pipeline
   */
  emitResponse(event: Omit<ResponseEvent, 'receivedAt'> & { receivedAt?: string }): Promise<ResponseEvent>;

  /**
   * Subscribes to response stream
   */
  registerListener(listener: ResponseEventHandler): () => void;

  /**
   * Optional provider-level validation
   */
  validateEvent?(event: ResponseEvent): Promise<boolean> | boolean;
}

/**
 * MockClassroomResponseProvider
 *
 * Software-first mock provider for development and automated test suites.
 * Does not require hardware or network interfaces.
 */
export class MockClassroomResponseProvider implements ClassroomResponseProvider {
  readonly id = 'mock-provider';
  readonly name = 'Mock Software Response Provider';
  readonly description = 'In-memory simulated provider for testing and software-first response execution';

  private listeners: Set<ResponseEventHandler> = new Set();
  private eventHistory: ResponseEvent[] = [];

  async emitResponse(eventInput: Omit<ResponseEvent, 'receivedAt'> & { receivedAt?: string }): Promise<ResponseEvent> {
    const event: ResponseEvent = {
      ...eventInput,
      receivedAt: eventInput.receivedAt || new Date().toISOString(),
      source: eventInput.source || this.id
    };

    this.eventHistory.push(event);

    for (const listener of this.listeners) {
      try {
        await listener(event);
      } catch (err) {
        console.error(`[MockClassroomResponseProvider] Listener error:`, err);
      }
    }

    return event;
  }

  registerListener(listener: ResponseEventHandler): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  getEventHistory(): readonly ResponseEvent[] {
    return [...this.eventHistory];
  }

  clear(): void {
    this.eventHistory = [];
    this.listeners.clear();
  }
}

export const mockResponseProvider = new MockClassroomResponseProvider();
