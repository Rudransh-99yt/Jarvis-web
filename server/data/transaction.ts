// Transaction and Consistency Coordination Foundation for Jarvis Data Repositories
import { AsyncLocalStorage } from 'node:async_hooks';

export interface TransactionOptions {
  /** Optional timeout in milliseconds for acquiring lock or completing transaction. Default: 10000ms */
  timeoutMs?: number;
  /** Name or tag of transaction for audit/telemetry logging */
  name?: string;
  /** User ID initiating the transaction for ownership boundary tracking */
  userId?: string;
  /** Whether transaction is read-only (skips dirty checks and disk flush) */
  readOnly?: boolean;
}

export interface TransactionContext {
  id: string;
  repo: any;
  name?: string;
  userId?: string;
  startedAt: string;
  depth: number;
}

export class TransactionTimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TransactionTimeoutError';
  }
}

export class TransactionRollbackError extends Error {
  public originalError: any;
  constructor(message: string, originalError?: any) {
    super(message);
    this.name = 'TransactionRollbackError';
    this.originalError = originalError;
  }
}

/**
 * Transient, process-local FIFO mutex with timeout support.
 * Ensures concurrent transactional mutations on the same repository serialize safely
 * without deadlock or data clobbering.
 */
export class AsyncMutex {
  private queue: Array<() => void> = [];
  private locked = false;

  async acquire(timeoutMs = 10000): Promise<() => void> {
    if (!this.locked) {
      this.locked = true;
      let released = false;
      return () => {
        if (released) return;
        released = true;
        this.release();
      };
    }

    let timer: NodeJS.Timeout | null = null;
    let acquireCallback: (() => void) | null = null;

    const timeoutPromise = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        // Remove from queue if timed out
        if (acquireCallback) {
          const idx = this.queue.indexOf(acquireCallback);
          if (idx !== -1) {
            this.queue.splice(idx, 1);
          }
        }
        reject(new TransactionTimeoutError(`Transaction lock acquisition timed out after ${timeoutMs}ms`));
      }, timeoutMs);
    });

    const acquirePromise = new Promise<() => void>((resolve) => {
      acquireCallback = () => {
        if (timer) clearTimeout(timer);
        let released = false;
        resolve(() => {
          if (released) return;
          released = true;
          this.release();
        });
      };
      this.queue.push(acquireCallback);
    });

    return Promise.race([acquirePromise, timeoutPromise]);
  }

  private release(): void {
    if (this.queue.length > 0) {
      const next = this.queue.shift()!;
      next();
    } else {
      this.locked = false;
    }
  }

  isLocked(): boolean {
    return this.locked;
  }

  get queueLength(): number {
    return this.queue.length;
  }
}

export const transactionStorage = new AsyncLocalStorage<TransactionContext>();

export function getCurrentTransaction(): TransactionContext | undefined {
  return transactionStorage.getStore();
}

function getItemKey(item: any): string {
  if (item && typeof item === 'object') {
    if ('id' in item && item.id !== undefined && item.id !== null && item.id !== '') return String(item.id);
    if ('userId' in item && item.userId !== undefined && item.userId !== null && item.userId !== '') return String(item.userId);
    if ('sessionId' in item && item.sessionId !== undefined && item.sessionId !== null && item.sessionId !== '') return String(item.sessionId);
    if ('code' in item && item.code !== undefined && item.code !== null && item.code !== '') return String(item.code);
    if ('actionId' in item && item.actionId !== undefined && item.actionId !== null && item.actionId !== '') return String(item.actionId);
  }
  return JSON.stringify(item);
}

function isPlainObject(val: any): boolean {
  return val !== null && typeof val === 'object' && !Array.isArray(val) && !(val instanceof Date);
}

function mergeItemObjects(baseItem: any, txItem: any, currentItem: any): any {
  if (!txItem) return currentItem;
  if (!currentItem) return txItem;

  if (!isPlainObject(txItem) || !isPlainObject(currentItem)) {
    return txItem !== undefined ? txItem : currentItem;
  }

  if (!isPlainObject(baseItem)) {
    const keys = new Set([...Object.keys(currentItem), ...Object.keys(txItem)]);
    const result: any = {};
    for (const key of keys) {
      if (key in txItem && key in currentItem) {
        if (isPlainObject(txItem[key]) && isPlainObject(currentItem[key])) {
          result[key] = mergeItemObjects(undefined, txItem[key], currentItem[key]);
        } else {
          result[key] = txItem[key];
        }
      } else if (key in txItem) {
        result[key] = txItem[key];
      } else {
        result[key] = currentItem[key];
      }
    }
    return result;
  }

  const allProps = new Set([
    ...Object.keys(baseItem),
    ...Object.keys(txItem),
    ...Object.keys(currentItem)
  ]);

  const merged: any = {};

  for (const prop of allProps) {
    const bVal = baseItem[prop];
    const tVal = txItem[prop];
    const cVal = currentItem[prop];

    const hasTx = prop in txItem;
    const hasCurrent = prop in currentItem;
    const hasBase = prop in baseItem;

    if (hasTx && !hasBase && !hasCurrent) {
      merged[prop] = tVal;
    } else if (!hasTx && hasBase && hasCurrent) {
      // Prop deleted by transaction
      // Omit
    } else if (!hasTx && hasBase && !hasCurrent) {
      // Omit
    } else if (!hasBase && !hasTx && hasCurrent) {
      merged[prop] = cVal;
    } else {
      const txChanged = JSON.stringify(tVal) !== JSON.stringify(bVal);
      const currentChanged = JSON.stringify(cVal) !== JSON.stringify(bVal);

      if (txChanged && !currentChanged) {
        if (tVal !== undefined) merged[prop] = tVal;
      } else if (!txChanged && currentChanged) {
        if (cVal !== undefined) merged[prop] = cVal;
      } else if (txChanged && currentChanged) {
        if (isPlainObject(tVal) && isPlainObject(cVal)) {
          merged[prop] = mergeItemObjects(bVal, tVal, cVal);
        } else {
          // Same-field conflict: Transaction-wins policy
          const winningVal = tVal !== undefined ? tVal : cVal;
          if (winningVal !== undefined) merged[prop] = winningVal;
        }
      } else {
        if (tVal !== undefined) {
          merged[prop] = tVal;
        } else if (cVal !== undefined) {
          merged[prop] = cVal;
        }
      }
    }
  }

  return merged;
}

export function mergeThreeWaySchemas<T = any>(
  base: T,
  txState: T,
  currentState: T
): T {
  if (!base) return (txState || currentState) as T;
  if (!currentState) return txState as T;
  if (!txState) return currentState as T;

  const merged: any = { ...(currentState as any) };

  merged.version = (txState as any).version || (currentState as any).version || (base as any).version || 1;

  const baseMeta = (base as any)?.meta;
  const txMeta = (txState as any)?.meta;
  const currentMeta = (currentState as any)?.meta;

  if (txMeta !== undefined || currentMeta !== undefined || baseMeta !== undefined) {
    if (isPlainObject(txMeta) || isPlainObject(currentMeta) || isPlainObject(baseMeta)) {
      merged.meta = mergeItemObjects(baseMeta || {}, txMeta || {}, currentMeta || {});
    } else {
      const txChanged = JSON.stringify(txMeta) !== JSON.stringify(baseMeta);
      const currentChanged = JSON.stringify(currentMeta) !== JSON.stringify(baseMeta);
      if (txChanged && !currentChanged) {
        if (txMeta !== undefined) merged.meta = txMeta;
      } else if (!txChanged && currentChanged) {
        if (currentMeta !== undefined) merged.meta = currentMeta;
      } else if (txChanged && currentChanged) {
        if (txMeta !== undefined) merged.meta = txMeta; // Same-field conflict: tx wins
      } else {
        if (txMeta !== undefined) merged.meta = txMeta;
        else if (currentMeta !== undefined) merged.meta = currentMeta;
      }
    }
  }

  const allKeys = new Set([
    ...Object.keys(base || {}),
    ...Object.keys(txState || {}),
    ...Object.keys(currentState || {})
  ]);

  for (const key of allKeys) {
    if (key === 'version' || key === 'meta') continue;

    const baseVal = base ? (base as any)[key] : undefined;
    const txVal = txState ? (txState as any)[key] : undefined;
    const currentVal = currentState ? (currentState as any)[key] : undefined;

    if (Array.isArray(baseVal) || Array.isArray(txVal) || Array.isArray(currentVal)) {
      const baseArr: any[] = Array.isArray(baseVal) ? baseVal : [];
      const txArr: any[] = Array.isArray(txVal) ? txVal : [];
      const currentArr: any[] = Array.isArray(currentVal) ? currentVal : [];

      const baseMap = new Map<string, any>();
      baseArr.forEach((item) => baseMap.set(getItemKey(item), item));

      const txMap = new Map<string, any>();
      txArr.forEach((item) => txMap.set(getItemKey(item), item));

      const currentMap = new Map<string, any>();
      currentArr.forEach((item) => currentMap.set(getItemKey(item), item));

      const orderedKeys: string[] = [];
      const seen = new Set<string>();

      for (const item of currentArr) {
        const k = getItemKey(item);
        if (!seen.has(k)) {
          seen.add(k);
          orderedKeys.push(k);
        }
      }
      for (const item of txArr) {
        const k = getItemKey(item);
        if (!seen.has(k)) {
          seen.add(k);
          orderedKeys.push(k);
        }
      }

      const mergedArr: any[] = [];

      for (const k of orderedKeys) {
        const inBase = baseMap.has(k);
        const inTx = txMap.has(k);
        const inCurrent = currentMap.has(k);

        const bItem = baseMap.get(k);
        const tItem = txMap.get(k);
        const cItem = currentMap.get(k);

        if (inTx && !inBase && !inCurrent) {
          mergedArr.push(tItem);
        } else if (!inTx && inBase && inCurrent) {
          // Omit (deleted by transaction)
        } else if (!inTx && inBase && !inCurrent) {
          // Omit
        } else if (inTx && inBase && !inCurrent) {
          const txChanged = JSON.stringify(tItem) !== JSON.stringify(bItem);
          if (txChanged) {
            mergedArr.push(tItem);
          }
        } else if (!inBase && !inTx && inCurrent) {
          mergedArr.push(cItem);
        } else if (inBase && inTx && inCurrent) {
          const txChanged = JSON.stringify(tItem) !== JSON.stringify(bItem);
          const currentChanged = JSON.stringify(cItem) !== JSON.stringify(bItem);

          if (txChanged && !currentChanged) {
            mergedArr.push(tItem);
          } else if (!txChanged && currentChanged) {
            mergedArr.push(cItem);
          } else if (txChanged && currentChanged) {
            if (tItem && typeof tItem === 'object' && cItem && typeof cItem === 'object') {
              mergedArr.push(mergeItemObjects(bItem, tItem, cItem));
            } else {
              mergedArr.push(tItem);
            }
          } else {
            mergedArr.push(tItem);
          }
        } else if (!inBase && inTx && inCurrent) {
          if (tItem && typeof tItem === 'object' && cItem && typeof cItem === 'object') {
            mergedArr.push(mergeItemObjects(bItem, tItem, cItem));
          } else {
            mergedArr.push(tItem);
          }
        }
      }

      merged[key] = mergedArr;
    } else if (isPlainObject(txVal) || isPlainObject(currentVal)) {
      merged[key] = mergeItemObjects(baseVal, txVal, currentVal);
    } else if (txVal !== undefined) {
      merged[key] = txVal;
    }
  }

  return merged as T;
}
