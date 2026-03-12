interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

declare global {
  // eslint-disable-next-line no-var
  var __depoStokMemoryCacheStore: Map<string, CacheEntry<unknown>> | undefined;
  // eslint-disable-next-line no-var
  var __depoStokMemoryCacheInFlight: Map<string, Promise<unknown>> | undefined;
}

function getStore() {
  if (!globalThis.__depoStokMemoryCacheStore) {
    globalThis.__depoStokMemoryCacheStore = new Map<string, CacheEntry<unknown>>();
  }
  return globalThis.__depoStokMemoryCacheStore;
}

function getInFlightStore() {
  if (!globalThis.__depoStokMemoryCacheInFlight) {
    globalThis.__depoStokMemoryCacheInFlight = new Map<string, Promise<unknown>>();
  }
  return globalThis.__depoStokMemoryCacheInFlight;
}

export async function getOrSetMemoryCache<T>(
  key: string,
  ttlMs: number,
  loader: () => Promise<T>
): Promise<T> {
  if (ttlMs <= 0) {
    return loader();
  }

  const now = Date.now();
  const store = getStore();
  const existing = store.get(key) as CacheEntry<T> | undefined;

  if (existing && existing.expiresAt > now) {
    return existing.value;
  }

  const inFlightStore = getInFlightStore();
  const inFlight = inFlightStore.get(key) as Promise<T> | undefined;
  if (inFlight) {
    return inFlight;
  }

  const loadPromise = loader()
    .then((value) => {
      store.set(key, {
        value,
        expiresAt: Date.now() + ttlMs
      });
      return value;
    })
    .finally(() => {
      inFlightStore.delete(key);
    });

  inFlightStore.set(key, loadPromise);
  return loadPromise;
}

export function invalidateMemoryCacheByPrefix(prefix: string): void {
  const store = getStore();
  const inFlightStore = getInFlightStore();

  for (const key of store.keys()) {
    if (key.startsWith(prefix)) {
      store.delete(key);
    }
  }

  for (const key of inFlightStore.keys()) {
    if (key.startsWith(prefix)) {
      inFlightStore.delete(key);
    }
  }
}
