// We'll export a method to get the global encryption key that's saved when ANY user logs in.
// Since it's a single-tenant app, the first login enables background tasks.

const globalStore = global as unknown as { encryptionKeys: Map<string, string>, globalEncryptionKey: string | null };

if (!globalStore.encryptionKeys) {
  globalStore.encryptionKeys = new Map<string, string>();
}
if (!globalStore.globalEncryptionKey) {
  globalStore.globalEncryptionKey = null;
}

export const sessionStore = globalStore.encryptionKeys;

export function setGlobalEncryptionKey(key: string) {
  globalStore.globalEncryptionKey = key;
}

export function getGlobalEncryptionKey(): string | null {
  return globalStore.globalEncryptionKey;
}
