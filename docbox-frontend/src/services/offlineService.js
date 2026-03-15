/**
 * offlineService.js
 * src/services/offlineService.js
 *
 * Secure pre-caching of documents (PDFs and images) for offline access.
 *
 * Downloads raw file bytes from the API and stores them AES-256-GCM
 * encrypted in IndexedDB via secureDocStore.
 *
 * This REPLACES the old service-worker CACHE_DOCUMENTS message for
 * document binaries. The SW still handles app-shell and API metadata —
 * this handles only the sensitive file bytes.
 *
 * Supported file types:
 *   PDF, JPG, JPEG, PNG, GIF, WEBP, SVG, BMP, TIFF
 */

import {
  saveSecureDoc,
  isDocCached,
  clearAllSecureDocs,
  sweepExpiredDocs,
  MIME_MAP,
} from '../utils/secureDocStore';

// ─── Cache a single document ──────────────────────────────────────────────────
/**
 * Downloads and securely caches one document (PDF or image).
 * Silently skips if already cached (unless force=true).
 *
 * @param {{ id: string|number, fileType: string }} doc
 * @param {{ force?: boolean }} options
 * @returns {Promise<{ skipped: boolean, bytes?: number }>}
 */
export const cacheDocumentSecurely = async (doc, { force = false } = {}) => {
  if (!doc?.id) throw new Error('Invalid document — missing id');

  const token = localStorage.getItem('token');
  if (!token) throw new Error('Not authenticated');

  // Skip if already cached and not forced
  if (!force && await isDocCached(doc.id)) {
    console.log(`[Offline] Doc ${doc.id} already cached — skipping`);
    return { skipped: true };
  }

  const response = await fetch(`/api/documents/${doc.id}/download`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    throw new Error(
      `Failed to fetch doc ${doc.id}: ${response.status} ${response.statusText}`
    );
  }

  const buffer   = await response.arrayBuffer();
  const fileType = doc.fileType?.toLowerCase();

  // Prefer Content-Type from server, fall back to our MIME map
  const mimeType =
    response.headers.get('Content-Type')?.split(';')[0].trim() ||
    MIME_MAP[fileType] ||
    'application/octet-stream';

  await saveSecureDoc(doc.id, buffer, mimeType);

  return { skipped: false, bytes: buffer.byteLength };
};

// ─── Cache multiple documents with progress ───────────────────────────────────
/**
 * Bulk-caches an array of documents (PDFs and/or images) with
 * per-item progress callbacks.
 *
 * @param {Array}    documents
 * @param {object}   options
 * @param {Function} options.onProgress  Called with ({ done, total, doc, error })
 * @param {Function} options.onComplete  Called with ({ total, cached, skipped, failed })
 * @returns {Promise<{ total, cached, skipped, failed }>}
 */
export const cacheDocumentsSecurely = async (
  documents,
  { onProgress, onComplete } = {}
) => {
  if (!Array.isArray(documents) || !documents.length) {
    return { total: 0, cached: 0, skipped: 0, failed: 0 };
  }

  const total = documents.length;
  let cached  = 0;
  let skipped = 0;
  let failed  = 0;

  console.log(`[Offline] Starting secure cache of ${total} document(s)...`);

  for (let i = 0; i < documents.length; i++) {
    const doc = documents[i];
    try {
      const result = await cacheDocumentSecurely(doc);
      if (result.skipped) skipped++;
      else cached++;
      onProgress?.({ done: i + 1, total, doc, error: null });
    } catch (err) {
      console.warn(`[Offline] Failed to cache doc ${doc.id}:`, err.message);
      failed++;
      onProgress?.({ done: i + 1, total, doc, error: err.message });
    }
  }

  const summary = { total, cached, skipped, failed };
  console.log('[Offline] Cache complete:', summary);
  onComplete?.(summary);

  return summary;
};

// ─── Clear all cached documents ───────────────────────────────────────────────
/**
 * Wipes all securely cached documents from IndexedDB.
 * Also clears the legacy unencrypted Cache API entries (migration safety).
 * Called automatically by authService.logout().
 */
export const clearOfflineDocuments = async () => {
  // Clear encrypted IndexedDB store
  await clearAllSecureDocs();

  // Clear legacy unencrypted Cache API (in case user had old cached docs)
  if ('caches' in window) {
    try {
      await caches.delete('docbox-docs-v1');
      console.log('[Offline] Legacy Cache API (docbox-docs-v1) cleared');
    } catch (err) {
      console.warn('[Offline] Could not clear legacy cache:', err.message);
    }
  }
};

// ─── Run TTL sweep ────────────────────────────────────────────────────────────
/**
 * Removes expired documents (older than 7 days).
 * Call on app startup — non-blocking, safe to fire-and-forget.
 */
export const runOfflineSweep = () => {
  sweepExpiredDocs().catch((err) =>
    console.warn('[Offline] Sweep error:', err.message)
  );
};