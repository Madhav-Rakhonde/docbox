/**
 * DocBox Service Worker  —  public/sw.js
 * Handles offline caching for the app shell, API responses, and document files.
 *
 * Caching strategies:
 *  - App shell (HTML/JS/CSS)  → Stale-while-revalidate
 *  - API list/meta endpoints  → Network-first with cache fallback
 *  - Document downloads       → Cache-first (works fully offline)
 *  - Navigation               → Network-first, fallback to /index.html
 */

const CACHE_VERSION   = 'v1';
const SHELL_CACHE     = `docbox-shell-${CACHE_VERSION}`;
const API_CACHE       = `docbox-api-${CACHE_VERSION}`;
const DOC_CACHE       = `docbox-docs-${CACHE_VERSION}`;

// App shell assets cached on install
const SHELL_ASSETS = ['/', '/index.html', '/offline.html'];

// API URL patterns to cache (network-first)
const API_PATTERNS = [
  /\/api\/documents(\?.*)?$/,
  /\/api\/documents\/stats/,
  /\/api\/documents\/expiring/,
  /\/api\/categories/,
  /\/api\/family-members/,
  /\/api\/users\/me/,
  /\/api\/notifications/,
  /\/api\/offline\/manifest/,
  /\/api\/offline\/documents/,
];

// Document binary patterns (cache-first)
const DOC_PATTERNS = [
  /\/api\/documents\/\d+\/download/,
  /\/api\/documents\/\d+\/thumbnail/,
];

// ─── Install ───────────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  console.log('[SW] Installing...');
  event.waitUntil(
    caches.open(SHELL_CACHE)
      .then((cache) => {
        // addAll can throw if any asset fails; use individual add with catch
        return Promise.allSettled(
          SHELL_ASSETS.map((url) =>
            cache.add(url).catch((e) => console.warn('[SW] Could not cache:', url, e.message))
          )
        );
      })
      .then(() => self.skipWaiting())
  );
});

// ─── Activate ─────────────────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating...');
  event.waitUntil(
    caches.keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k.startsWith('docbox-') && !k.endsWith(CACHE_VERSION))
            .map((k) => {
              console.log('[SW] Deleting stale cache:', k);
              return caches.delete(k);
            })
        )
      )
      .then(() => self.clients.claim())
  );
});

// ─── Fetch ────────────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET, chrome-extension, and cross-origin non-API requests
  if (request.method !== 'GET') return;
  if (url.protocol === 'chrome-extension:') return;

  // 1. Document files (PDFs, images) → cache-first
  if (DOC_PATTERNS.some((p) => p.test(url.pathname))) {
    event.respondWith(cacheFirst(request, DOC_CACHE));
    return;
  }

  // 2. API routes → network-first with offline JSON fallback
  if (url.pathname.startsWith('/api/') && API_PATTERNS.some((p) => p.test(url.pathname))) {
    event.respondWith(networkFirst(request, API_CACHE));
    return;
  }

  // 3. HTML navigation → network-first, fallback to /index.html (SPA)
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() =>
        caches.match('/index.html')
          .then((r) => r || caches.match('/offline.html'))
      )
    );
    return;
  }

  // 4. Static assets (JS, CSS, fonts, images) → stale-while-revalidate
  if (url.origin === self.location.origin) {
    event.respondWith(staleWhileRevalidate(request, SHELL_CACHE));
  }
});

// ─── Strategy: Network-first ──────────────────────────────────────────────
async function networkFirst(request, cacheName) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;

    // Return a graceful offline JSON so the UI doesn't crash
    return new Response(
      JSON.stringify({
        success: false,
        offline: true,
        message: 'You are offline. Showing cached data.',
        data: null,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// ─── Strategy: Cache-first ────────────────────────────────────────────────
async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response('Document not available offline.', {
      status: 503,
      headers: { 'Content-Type': 'text/plain' },
    });
  }
}

// ─── Strategy: Stale-while-revalidate ────────────────────────────────────
async function staleWhileRevalidate(request, cacheName) {
  const cache  = await caches.open(cacheName);
  const cached = await cache.match(request);

  // Always try to update in background
  const fetchPromise = fetch(request)
    .then((response) => {
      if (response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => null);

  return cached || (await fetchPromise);
}

// ─── Message handler: cache documents on demand ───────────────────────────
self.addEventListener('message', async (event) => {

  // ── CACHE_DOCUMENTS: pre-download all doc files ──────────────────────
  if (event.data?.type === 'CACHE_DOCUMENTS') {
    const { documents } = event.data;
    if (!Array.isArray(documents) || !documents.length) return;

    console.log('[SW] Pre-caching', documents.length, 'documents...');
    const cache = await caches.open(DOC_CACHE);
    let cached  = 0;

    for (const doc of documents) {
      const downloadUrl = `/api/documents/${doc.id}/download`;
      try {
        const existing = await cache.match(downloadUrl);
        if (!existing) {
          const response = await fetch(downloadUrl);
          if (response.ok) {
            await cache.put(downloadUrl, response);
            cached++;
          }
        }
      } catch (e) {
        console.warn('[SW] Could not cache doc', doc.id, ':', e.message);
      }
    }

    console.log('[SW] Done caching. New:', cached, '/', documents.length);

    // Notify all clients
    const clients = await self.clients.matchAll({ includeUncontrolled: true });
    clients.forEach((client) =>
      client.postMessage({ type: 'DOCUMENTS_CACHED', count: documents.length, newlyCached: cached })
    );
  }

  // ── CACHE_API_RESPONSE: manually cache an API payload ────────────────
  if (event.data?.type === 'CACHE_API_RESPONSE') {
    const { url, data } = event.data;
    if (!url || !data) return;
    try {
      const cache    = await caches.open(API_CACHE);
      const response = new Response(JSON.stringify(data), {
        headers: { 'Content-Type': 'application/json' },
      });
      await cache.put(url, response);
    } catch (e) {
      console.warn('[SW] CACHE_API_RESPONSE failed:', e.message);
    }
  }
});