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

// Singleton persistent repository for the server lifecycle
export const jarvisData: IJarvisDataRepository = new DiskJarvisDataRepository();

// Factory for testing or alternative configurations
export function createRepository(type: 'disk' | 'memory' = 'disk', customPath?: string): IJarvisDataRepository {
  if (type === 'memory') {
    return new MemoryJarvisDataRepository();
  }
  return new DiskJarvisDataRepository(customPath);
}
