// Jarvis Core Data Layer Provider
import { DiskJarvisDataRepository } from './diskRepository.ts';
import { MemoryJarvisDataRepository } from './memoryRepository.ts';
import type { IJarvisDataRepository } from './repository.ts';

export * from './types.ts';
export * from './repository.ts';
export * from './seedData.ts';
export { JsonFileStore } from './fileStore.ts';
export { DiskJarvisDataRepository } from './diskRepository.ts';
export { MemoryJarvisDataRepository } from './memoryRepository.ts';

// Singleton persistent repository for the server lifecycle with test isolation support
let activeRepository: IJarvisDataRepository = new DiskJarvisDataRepository();

export const jarvisData: IJarvisDataRepository = new Proxy({} as IJarvisDataRepository, {
  get(_target, prop) {
    const val = (activeRepository as any)[prop];
    if (typeof val === 'function') {
      return val.bind(activeRepository);
    }
    return val;
  },
  set(_target, prop, value) {
    (activeRepository as any)[prop] = value;
    return true;
  }
});

export function setActiveRepository(repo: IJarvisDataRepository): void {
  activeRepository = repo;
}

export function resetActiveRepository(): void {
  activeRepository = new DiskJarvisDataRepository();
}

export function getActiveRepository(): IJarvisDataRepository {
  return activeRepository;
}

// Factory for testing or alternative configurations
export function createRepository(type: 'disk' | 'memory' = 'disk', customPath?: string): IJarvisDataRepository {
  if (type === 'memory') {
    return new MemoryJarvisDataRepository();
  }
  return new DiskJarvisDataRepository(customPath);
}
