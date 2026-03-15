/**
 * secureDocStore.js
 * src/utils/secureDocStore.js
 *
 * Encrypted offline document storage using IndexedDB + AES-256-GCM.
 *
 * Supports all offline-previewable file types:
 *   PDF  → stored as application/pdf
 *   JPG  → stored as image/jpeg
 *   JPEG → stored as image/jpeg
 *   PNG  → stored as image/png
 *   GIF  → stored as image/gif
 *   WEBP → stored as image/webp
 *   SVG  → stored as image/svg+xml
 *   BMP  → stored as image/bmp
 *   TIFF → stored as image/tiff
 *
 * Each document is AES-256-GCM encrypted before being written to IndexedDB.
 * The encryption key is derived from the user's auth token (never stored).
 * On logout, clearAllSecureDocs() wipes all entries — and even without
 * that call, removing the token makes all blobs permanently undecryptable.
 *
 * Features:
 *   - Per-document AES-256-GCM encryption
 *   - 7-day TTL with lazy expiry check on read + background sweep
 *   - isDocCached() metadata check without decryption (cheap)
 *   - clearAllSecureDocs() for logout
 *   - sweepExpiredDocs() for startup cleanup
 */

import { deriveKey, encryptBuffer, decryptBuffer } from './cryptoUtils';

const DB_NAME    = 'docbox-secure';
const DB_VERSION = 1;
const STORE_NAME = 'encrypted-docs';
const TTL_MS     = 7 * 24 * 60 * 60 * 1000; // 7 days

// MIME type map — used as fallback when server doesn't send Content-Type
export const MIME_MAP = {
  pdf:  'application/pdf',
  jpg:  'image/jpeg',
  jpeg: 'image/jpeg',
  png:  'image/png',
  gif:  'image/gif',
  webp: 'image/webp',
  svg:  'image/svg+xml',
  bmp:  'image/bmp',
  tiff: 'image/tiff',
};

// ─── Open / upgrade DB ────────────────────────────────────────────────────────
const openDB = () =>
  new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('cachedAt', 'cachedAt'); // for TTL sweeps
      }
    };

    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });

// ─── Save (encrypt → store) ───────────────────────────────────────────────────
/**
 * Encrypts a file's ArrayBuffer and stores it in IndexedDB.
 * Works for any supported file type (PDF or image).
 *
 * @param {string|number} docId
 * @param {ArrayBuffer}   arrayBuffer  Raw file bytes
 * @param {string}        mimeType     e.g. 'application/pdf' or 'image/png'
 */
export const saveSecureDoc = async (docId, arrayBuffer, mimeType) => {
  const token = localStorage.getItem('token');
  if (!token) throw new Error('No auth token — cannot encrypt document');

  const key                = await deriveKey(token);
  const { iv, ciphertext } = await encryptBuffer(key, arrayBuffer);

  const db = await openDB();

  await new Promise((resolve, reject) => {
    const tx    = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req   = store.put({
      id:         String(docId),
      iv:         Array.from(iv),          // Uint8Array → plain array (IDB-serialisable)
      ciphertext: Array.from(ciphertext),  // Uint8Array → plain array
      mimeType,
      cachedAt:   Date.now(),
    });
    req.onsuccess = () => resolve();
    req.onerror   = () => reject(req.error);
  });

  console.log(
    `[SecureStore] Saved doc ${docId} | ${mimeType} | ` +
    `${(arrayBuffer.byteLength / 1024).toFixed(1)} KB`
  );
};

// ─── Load (fetch → decrypt) ───────────────────────────────────────────────────
/**
 * Loads and decrypts a document from IndexedDB.
 * Returns null if not found or TTL expired.
 *
 * The returned buffer contains the exact original file bytes and can be
 * used directly to create a Blob for any file type (PDF or image).
 *
 * @param   {string|number} docId
 * @returns {Promise<{ buffer: ArrayBuffer, mimeType: string } | null>}
 */
export const loadSecureDoc = async (docId) => {
  const token = localStorage.getItem('token');
  if (!token) throw new Error('No auth token — cannot decrypt document');

  const db = await openDB();

  const record = await new Promise((resolve, reject) => {
    const tx    = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req   = store.get(String(docId));
    req.onsuccess = () => resolve(req.result ?? null);
    req.onerror   = () => reject(req.error);
  });

  if (!record) return null;

  // Lazy TTL check — delete and return null if expired
  if (Date.now() - record.cachedAt > TTL_MS) {
    console.log(`[SecureStore] Doc ${docId} expired — removing`);
    await deleteSecureDoc(docId);
    return null;
  }

  const key        = await deriveKey(token);
  const iv         = new Uint8Array(record.iv);
  const ciphertext = new Uint8Array(record.ciphertext);

  const decrypted = await decryptBuffer(key, iv, ciphertext);

  return { buffer: decrypted, mimeType: record.mimeType };
};

// ─── Check if cached ──────────────────────────────────────────────────────────
/**
 * Returns true if the document is cached and not expired.
 * Does NOT decrypt — metadata-only check, very cheap.
 *
 * @param   {string|number} docId
 * @returns {Promise<boolean>}
 */
export const isDocCached = async (docId) => {
  try {
    const db = await openDB();

    const record = await new Promise((resolve, reject) => {
      const tx    = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req   = store.get(String(docId));
      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror   = () => reject(req.error);
    });

    if (!record) return false;
    if (Date.now() - record.cachedAt > TTL_MS) return false;

    return true;
  } catch {
    return false;
  }
};

/**
 * Returns a list of all cached doc IDs that are still within TTL.
 * Useful for showing a "saved for offline" badge in the UI.
 *
 * @returns {Promise<string[]>}
 */
export const getCachedDocIds = async () => {
  try {
    const db  = await openDB();
    const now = Date.now();
    const ids = [];

    await new Promise((resolve, reject) => {
      const tx    = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req   = store.openCursor();

      req.onsuccess = (e) => {
        const cursor = e.target.result;
        if (cursor) {
          if (now - cursor.value.cachedAt <= TTL_MS) {
            ids.push(cursor.value.id);
          }
          cursor.continue();
        } else {
          resolve();
        }
      };

      req.onerror = () => reject(req.error);
    });

    return ids;
  } catch {
    return [];
  }
};

// ─── Delete one ───────────────────────────────────────────────────────────────
/**
 * Removes a single document's encrypted entry from IndexedDB.
 *
 * @param {string|number} docId
 */
export const deleteSecureDoc = async (docId) => {
  const db = await openDB();

  await new Promise((resolve, reject) => {
    const tx    = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req   = store.delete(String(docId));
    req.onsuccess = () => resolve();
    req.onerror   = () => reject(req.error);
  });

  console.log(`[SecureStore] Deleted doc ${docId}`);
};

// ─── Clear all (call on logout) ───────────────────────────────────────────────
/**
 * Wipes every encrypted entry from the store.
 * Called automatically from authService.logout().
 * Even without this call, removing the token makes all blobs undecryptable —
 * but clearing is good hygiene.
 */
export const clearAllSecureDocs = async () => {
  try {
    const db = await openDB();

    await new Promise((resolve, reject) => {
      const tx    = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req   = store.clear();
      req.onsuccess = () => resolve();
      req.onerror   = () => reject(req.error);
    });

    console.log('[SecureStore] All encrypted documents cleared');
  } catch (err) {
    console.error('[SecureStore] clearAll failed:', err);
  }
};

// ─── Sweep expired entries ────────────────────────────────────────────────────
/**
 * Finds and deletes all entries older than TTL_MS.
 * Non-blocking — call on app startup without awaiting if desired.
 */
export const sweepExpiredDocs = async () => {
  try {
    const db      = await openDB();
    const cutoff  = Date.now() - TTL_MS;
    const expired = [];

    await new Promise((resolve, reject) => {
      const tx    = db.transaction(STORE_NAME, 'readonly');
      const index = tx.objectStore(STORE_NAME).index('cachedAt');
      const range = IDBKeyRange.upperBound(cutoff);
      const req   = index.openCursor(range);

      req.onsuccess = (e) => {
        const cursor = e.target.result;
        if (cursor) {
          expired.push(cursor.primaryKey);
          cursor.continue();
        } else {
          resolve();
        }
      };

      req.onerror = () => reject(req.error);
    });

    for (const id of expired) await deleteSecureDoc(id);

    if (expired.length > 0) {
      console.log(`[SecureStore] Swept ${expired.length} expired document(s)`);
    }
  } catch (err) {
    console.error('[SecureStore] Sweep failed:', err);
  }
};