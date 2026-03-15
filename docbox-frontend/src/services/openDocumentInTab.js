/**
 * openDocumentInTab.js
 * src/services/openDocumentInTab.js
 *
 * Opens a document in a new browser tab instantly by navigating to
 * the in-app viewer route /view/:id.
 *
 * The tab opens in < 100ms. The viewer page handles fetching and
 * rendering the file with a loading spinner.
 *
 * This function is synchronous — no fetch, no waiting, no Promise.
 */

const PREVIEWABLE = new Set([
  'pdf', 'jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'tiff', 'svg',
]);

/**
 * @param {object}   document   { id, originalFilename, fileType }
 * @param {function} [onError]  called with an error message string on failure
 */
export const openDocumentInTab = (document, onError) => {
  if (!document?.id) {
    onError?.('Invalid document');
    return;
  }

  const fileType = document.fileType?.toLowerCase();

  if (!PREVIEWABLE.has(fileType)) {
    onError?.(
      `${fileType?.toUpperCase() || 'This'} file type cannot be previewed — please use Download.`
    );
    return;
  }

  const tab = window.open(`/view/${document.id}`, '_blank');

  if (!tab) {
    onError?.(
      'Popup blocked — please allow popups for this site and try again, or use the Download button.'
    );
  }
};