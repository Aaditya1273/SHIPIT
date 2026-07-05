export async function register() {
  if (typeof globalThis !== 'undefined' && !('indexedDB' in globalThis)) {
    (globalThis as any).indexedDB = {
      open: () => ({
        result: { objectStoreNames: { contains: () => false } },
        onupgradeneeded: null,
        onsuccess: null,
        onerror: null,
      }),
      deleteDatabase: () => ({}),
    };
  }
}
