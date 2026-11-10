export interface TraceArchive {
  manifest: VaultManifest;
  trace(entry: string): Promise<Record<string, any>[]>;
  fileUrl(path: string): Promise<string>;
  dispose(): void;
}
export interface VaultDescriptor {
  version: number; cipher: string; compression: string; kdf: string; hash: string;
  iterations: number; salt: string; manifest: string;
}
export interface VaultManifest {
  version: number; run?: string; files: Record<string, { file: string; mime: string }>;
  traces: Record<string, any>[];
}
const filenamePattern = /^[a-f0-9]{32}\.enc$/;
const decoder = new TextDecoder();

export async function deriveVaultKey(password: string, descriptor: VaultDescriptor) {
  if (descriptor.version !== 1 || descriptor.cipher !== 'AES-GCM' || descriptor.compression !== 'gzip' || descriptor.kdf !== 'PBKDF2' || descriptor.hash !== 'SHA-256' || !Number.isInteger(descriptor.iterations) || descriptor.iterations < 600_000 || descriptor.iterations > 2_000_000 || !filenamePattern.test(descriptor.manifest)) throw new Error('Unsupported encrypted archive.');
  const salt = Uint8Array.from(atob(descriptor.salt), c => c.charCodeAt(0));
  if (salt.length !== 16) throw new Error('Invalid archive salt.');
  const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(password.normalize('NFC')), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: descriptor.iterations }, material, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
}

export async function decryptVaultBytes(buffer: ArrayBuffer, key: CryptoKey, filename: string) {
  if (!filenamePattern.test(filename) || buffer.byteLength < 28) throw new Error('Invalid encrypted file.');
  const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: buffer.slice(0, 12), additionalData: new TextEncoder().encode(`trace-vault:v1:${filename}`), tagLength: 128 }, key, buffer.slice(12));
  return new Response(new Blob([decrypted]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
}

export class TraceVault {
  #key: CryptoKey | null;
  #controller = new AbortController();
  #urls = new Map<string, Promise<string>>();
  constructor(key: CryptoKey, public manifest: VaultManifest, private base: string) { this.#key = key; }
  async bytes(filename: string) {
    if (!this.#key || !filenamePattern.test(filename)) throw new Error('Archive is locked.');
    const key = this.#key;
    const response = await fetch(`${this.base}/${filename}`, { signal: this.#controller.signal });
    if (!response.ok) throw new Error('Encrypted file could not be fetched.');
    const result = await decryptVaultBytes(await response.arrayBuffer(), key, filename);
    if (!this.#key) throw new Error('Archive is locked.');
    return result;
  }
  async trace(entry: string) { return JSON.parse(decoder.decode(await this.bytes(entry))) as Record<string, any>[]; }
  fileUrl(path: string) {
    const file = this.manifest.files[path];
    if (!file || !this.#key) return Promise.reject(new Error('File unavailable.'));
    if (!this.#urls.has(path)) {
      const promise = this.bytes(file.file).then(bytes => {
        // Files are untrusted trace outputs; never render HTML/SVG as active content.
        const type = file.mime === 'image/png' || file.mime === 'image/jpeg' ? file.mime : file.mime.startsWith('text/') || file.mime === 'application/json' || file.mime === 'application/x-ndjson' ? 'text/plain' : 'application/octet-stream';
        const url = URL.createObjectURL(new Blob([bytes], { type }));
        if (!this.#key) { URL.revokeObjectURL(url); throw new Error('Archive is locked.'); }
        return url;
      }).catch(error => { this.#urls.delete(path); throw error; });
      this.#urls.set(path, promise);
    }
    return this.#urls.get(path)!;
  }
  dispose() {
    this.#key = null; this.#controller.abort();
    for (const promise of this.#urls.values()) promise.then(url => URL.revokeObjectURL(url)).catch(() => {});
    this.#urls.clear(); this.manifest = { version: 1, files: {}, traces: [] };
  }
}

export async function unlockVault(password: string, base = '/trace-vault') {
  if (!globalThis.crypto?.subtle || !globalThis.DecompressionStream) throw new Error('This viewer requires a modern browser over HTTPS or localhost.');
  const response = await fetch(`${base}/vault.json`, { cache: 'no-store' });
  if (response.status === 404) throw new Error('The encrypted archive has not been packaged yet.');
  if (!response.ok) throw new Error('The encrypted archive could not be loaded.');
  const descriptor: VaultDescriptor = await response.json();
  const key = await deriveVaultKey(password, descriptor);
  const vault = new TraceVault(key, { version: 1, traces: [], files: {} }, base);
  try {
    const manifest: VaultManifest = JSON.parse(decoder.decode(await vault.bytes(descriptor.manifest)));
    if (manifest.version !== 1 || !Array.isArray(manifest.traces) || !manifest.files) throw new Error('Invalid archive manifest.');
    vault.manifest = manifest; return vault;
  } catch { vault.dispose(); throw new Error('Could not unlock: the password is incorrect, or the archive is damaged.'); }
}
