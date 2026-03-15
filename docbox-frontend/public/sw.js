/**
 * sw.js  —  public/sw.js
 * DocBox Service Worker
 *
 * Handles offline caching for the app shell, API metadata, and navigation.
 *
 * ── What this SW caches ──────────────────────────────────────────────────────
 *   App shell (HTML / JS / CSS)  →  Stale-while-revalidate
 *   API list / meta endpoints    →  Network-first with cache fallback
 *   Navigation requests          →  Network-first, fallback to /index.html
 *
 * ── What this SW does NOT cache ──────────────────────────────────────────────
 *   Document binaries (PDFs, images) are stored AES-256-GCM encrypted
 *   in IndexedDB by offlineService.js + secureDocStore.js.
 *   The old DOC_CACHE and CACHE_DOCUMENTS handler have been removed.
 */

const CACHE_VERSION = 'v1';          // ← kept as v1 so existing shell cache is preserved
const SHELL_CACHE   = `docbox-shell-${CACHE_VERSION}`;
const API_CACHE     = `docbox-api-${CACHE_VERSION}`;

// Only pre-cache the bare minimum on install.
// Hashed JS/CSS bundles (assets/index-xxx.js) are added automatically
// by staleWhileRevalidate on first online load and served from cache offline.
const SHELL_ASSETS = ['/', '/index.html', '/offline.html'];

// API URL patterns — network-first with offline JSON fallback
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

// ─── Install ───────────────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  console.log('[SW] Installing...');
  event.waitUntil(
    caches.open(SHELL_CACHE)
      .then((cache) =>
        Promise.allSettled(
          SHELL_ASSETS.map((url) =>
            cache.add(url).catch((e) =>
              console.warn('[SW] Could not pre-cache:', url, e.message)
            )
          )
        )
      )
      .then(() => self.skipWaiting())
  );
});

// ─── Activate ─────────────────────────────────────────────────────────────────
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

// ─── Fetch ─────────────────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET and chrome-extension requests
  if (request.method !== 'GET') return;
  if (url.protocol === 'chrome-extension:') return;

  // 1. API metadata routes → network-first with offline JSON fallback
  if (url.pathname.startsWith('/api/') && API_PATTERNS.some((p) => p.test(url.pathname))) {
    event.respondWith(networkFirst(request, API_CACHE));
    return;
  }

  // 2. HTML navigation → network-first, fallback to /index.html (SPA shell).
  //    This ensures /view/:id works offline — SW serves index.html,
  //    React Router boots, DocumentViewerPage loads doc from IndexedDB.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .catch(() =>
          caches.match(request)
            .then((r) => r || caches.match('/index.html'))
            .then((r) => r || caches.match('/offline.html'))
            .then((r) => {
              if (r) return r;
              // Last resort inline fallback — prevents blank white screen
              return new Response(
                '<html><body><h2>You are offline</h2><p>Please reconnect and reload.</p></body></html>',
                { status: 200, headers: { 'Content-Type': 'text/html' } }
              );
            })
        )
    );
    return;
  }

  // 3. Static assets (JS, CSS, fonts, icons) → stale-while-revalidate.
  //    Hashed bundles get cached on first online visit and served offline.
  if (url.origin === self.location.origin) {
    event.respondWith(staleWhileRevalidate(request, SHELL_CACHE));
  }
});

// ─── Strategy: Network-first ──────────────────────────────────────────────────
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

    // Graceful offline JSON so UI list components don't crash
    return new Response(
      JSON.stringify({
        success: false,
        offline: true,
        message: 'You are offline. Showing cached data.',
        data:    null,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// ─── Strategy: Stale-while-revalidate ─────────────────────────────────────────
async function staleWhileRevalidate(request, cacheName) {
  const cache  = await caches.open(cacheName);
  const cached = await cache.match(request);

  // Always try to refresh in the background
  const fetchPromise = fetch(request)
    .then((response) => {
      if (response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => null);

  if (cached) {
    // Serve from cache immediately, update happens in background
    fetchPromise.catch(() => {}); // suppress unhandled rejection warning
    return cached;
  }

  // Nothing cached — wait for network
  const fetched = await fetchPromise;
  if (fetched) return fetched;

  // Both cache and network failed (offline + asset not yet cached).
  // Return a proper 503 Response instead of throwing or returning null.
  // Throwing / returning null is what caused the
  // "Failed to convert value to Response" errors in the console.
  return new Response('Asset not available offline.', {
    status:  503,
    headers: { 'Content-Type': 'text/plain' },
  });
}

// ─── Message handler ───────────────────────────────────────────────────────────
self.addEventListener('message', async (event) => {

  // CACHE_API_RESPONSE: manually cache a specific API payload
  if (event.data?.type === 'CACHE_API_RESPONSE') {
    const { url, data } = event.data;
    if (!url || !data) return;
    try {
      const cache    = await caches.open(API_CACHE);
      const response = new Response(JSON.stringify(data), {
        headers: { 'Content-Type': 'application/json' },
      });
      await cache.put(url, response);
      console.log('[SW] Manually cached API response for:', url);
    } catch (e) {
      console.warn('[SW] CACHE_API_RESPONSE failed:', e.message);
    }
  }

  // NOTE: CACHE_DOCUMENTS has been intentionally removed.
  // Document binaries (PDFs, images) are now AES-256-GCM encrypted and
  // stored in IndexedDB by offlineService.cacheDocumentsSecurely().
});