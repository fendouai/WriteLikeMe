import { afterEach, vi } from 'vitest';

// Ensure a fully-functional in-memory localStorage/Storage for the jsdom environment,
// which in some vitest/jsdom combinations exposes a non-standard localStorage object.
function createMemoryStorage(): Storage {
  const store = new Map<string, string>();
  return {
    get length() {
      return store.size;
    },
    clear() {
      store.clear();
    },
    getItem(key: string) {
      return store.has(key) ? store.get(key)! : null;
    },
    setItem(key: string, value: string) {
      store.set(key, String(value));
    },
    removeItem(key: string) {
      store.delete(key);
    },
    key(index: number) {
      return [...store.keys()][index] ?? null;
    },
  };
}

if (typeof globalThis.localStorage === 'undefined' || typeof globalThis.localStorage?.clear !== 'function') {
  Object.defineProperty(globalThis, 'localStorage', { value: createMemoryStorage(), configurable: true, writable: true });
}

afterEach(() => {
  vi.restoreAllMocks();
});
