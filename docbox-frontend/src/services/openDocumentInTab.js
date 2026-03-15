/**
 * openDocumentInTab.js
 * src/services/openDocumentInTab.js
 *
 * Opens a document for viewing in a new browser tab.
 *
 * ── Online ──────────────────────────────────────────────────────────────────
 *   Navigates to /view/:id. The SPA viewer page (DocumentViewerPage)
 *   handles fetching, loading spinner, and rendering.
 *
 * ── Offline ─────────────────────────────────────────────────────────────────
 *   Loads the encrypted bytes from IndexedDB, decrypts them in memory,
 *   wraps them in a Blob with the correct MIME type, and opens a temporary
 *   Blob URL in a new tab. No network request is made at all.
 *
 *   The Blob URL is revoked after 10 seconds (the tab has loaded by then).
 *   Decrypted bytes exist only in memory — never written to disk.
 *
 * ── Supported file types ────────────────────────────────────────────────────
 *   PDF  → browser built-in PDF viewer
 *   JPG / JPEG / PNG / GIF / WEBP / BMP / TIFF / SVG → browser image viewer
 */

import { loadSecureDoc } from '../utils/secureDocStore';

const PREVIEWABLE = new Set([
  'pdf',
  'jpg', 'jpeg',
  'png',
  'gif',
  'webp',
  'bmp',
  'tiff',
  'svg',
]);

/**
 * @param {object}   document              { id, originalFilename, fileType }
 * @param {Function} [onError]             Called with a user-facing error string
 */
export const openDocumentInTab = async (document, onError) => {
  // ── Validate ───────────────────────────────────────────────────────────────
  if (!document?.id) {
    onError?.('Invalid document');
    return;
  }

  const fileType = document.fileType?.toLowerCase();

  if (!PREVIEWABLE.has(fileType)) {
    onError?.(
      `${fileType?.toUpperCase() || 'This'} file type cannot be previewed — ` +
      'please use the Download button.'
    );
    return;
  }

  // ── Offline path ───────────────────────────────────────────────────────────
  if (!navigator.onLine) {
    try {
      const result = await loadSecureDoc(document.id);

      if (!result) {
        onError?.(
          'This document has not been saved for offline use. ' +
          'Connect to the internet and open the document once to cache it.'
        );
        return;
      }

      // result.buffer → original file bytes (PDF or image)
      // result.mimeType → e.g. 'application/pdf' or 'image/png'
      const blob    = new Blob([result.buffer], { type: result.mimeType });
      const blobUrl = URL.createObjectURL(blob);

      const tab = window.open(blobUrl, '_blank');

      if (!tab) {
        URL.revokeObjectURL(blobUrl);
        onError?.(
          'Popup blocked — please allow popups for this site and try again.'
        );
        return;
      }

      // Revoke the Blob URL after the tab has had time to load it.
      // The tab keeps its own reference; revocation only affects future
      // navigations to the same URL — the already-loaded content is unaffected.
      setTimeout(() => URL.revokeObjectURL(blobUrl), 10_000);

    } catch (err) {
      console.error('[openDocumentInTab] Offline open failed:', err);

      if (err.message?.includes('token')) {
        onError?.(
          'Your session has expired. Please log in again to view offline documents.'
        );
      } else {
        onError?.(
          'Could not open the document offline. Please try again or use Download.'
        );
      }
    }

    return;
  }

  // ── Online path ────────────────────────────────────────────────────────────
  // SPA route — DocumentViewerPage handles fetching and rendering
  const tab = window.open(`/view/${document.id}`, '_blank');

  if (!tab) {
    onError?.(
      'Popup blocked — please allow popups for this site and try again, ' +
      'or use the Download button.'
    );
  }
};