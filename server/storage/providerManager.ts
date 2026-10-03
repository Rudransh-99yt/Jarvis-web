// Storage Provider Manager (Milestone 10)
import type { IStorageProvider } from './types.ts';
import { LocalStorageProvider, defaultLocalStorageProvider } from './localStorageProvider.ts';

export class StorageProviderManager {
  private activeProvider: IStorageProvider;

  constructor() {
    const providerType = process.env.STORAGE_PROVIDER || 'local';
    if (providerType === 'local') {
      this.activeProvider = defaultLocalStorageProvider;
    } else {
      // Future cloud provider expansion (e.g. 's3', 'gcs')
      console.warn(`[StorageProviderManager] Storage provider '${providerType}' not yet enabled, falling back to local-disk.`);
      this.activeProvider = defaultLocalStorageProvider;
    }
  }

  getProvider(): IStorageProvider {
    return this.activeProvider;
  }

  setProvider(provider: IStorageProvider): void {
    this.activeProvider = provider;
  }

  resetToDefault(): void {
    this.activeProvider = defaultLocalStorageProvider;
  }
}

export const storageManager = new StorageProviderManager();
