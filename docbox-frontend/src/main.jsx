import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

// ── Register Service Worker for PWA / Offline support ─────────────────────
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then((reg) => {
        console.log('[App] Service Worker registered:', reg.scope);

        // Silently check for updates every 30 min
        setInterval(() => reg.update(), 30 * 60 * 1000);

        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                console.log('[App] New Service Worker available — refresh to update');
              }
            });
          }
        });
      })
      .catch((err) => console.warn('[App] SW registration failed:', err));

    // Listen for SW messages (e.g., caching complete)
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data?.type === 'DOCUMENTS_CACHED') {
        console.log('[App] SW cached', event.data.count, 'documents for offline use');
      }
    });
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);