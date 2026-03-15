import { useEffect } from 'react';
import { toast } from 'react-toastify';
import { openDocumentInTab } from '../../services/openDocumentInTab';

/**
 * DocumentViewer
 * src/components/Documents/DocumentViewer.jsx
 *
 * Zero-UI shim. When `open` becomes true it calls openDocumentInTab()
 * (synchronous — no waiting) then calls onClose() to reset parent state.
 *
 * Callers are unchanged:
 *   <DocumentViewer open={viewerOpen} document={doc} onClose={...} />
 *
 * Renders null — the new browser tab IS the viewer.
 */
const DocumentViewer = ({ open, document, onClose }) => {
  useEffect(() => {
    if (!open || !document?.id) return;

    // openDocumentInTab is synchronous — opens the tab instantly
    openDocumentInTab(document, (errMsg) => toast.error(errMsg));

    // Reset parent state immediately after opening
    if (onClose) onClose();

  }, [open, document?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
};

export default DocumentViewer;