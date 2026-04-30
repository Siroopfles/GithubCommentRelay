// A simple global in-memory store to hold the encryption key.
// Since Next.js API routes in dev might clear this on reload, we use globalThis.
// This is sufficient for a single-tenant local LXC tool.

const globalStore = global as unknown as { encryptionKeys: Map<string, string> };

if (!globalStore.encryptionKeys) {
  globalStore.encryptionKeys = new Map<string, string>();
}

export const sessionStore = globalStore.encryptionKeys;
