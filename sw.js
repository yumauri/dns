const CACHE_VERSION = 'v2'
const CACHE_NAME = `dns-static-cache-${CACHE_VERSION}`

const CACHED_FILES = [
  './', // index.html
  './index.html',
  'https://cdnjs.cloudflare.com/ajax/libs/lz-string/1.5.0/lz-string.min.js',
]

// install event - cache the files
self.addEventListener('install', (e) => {
  console.log('[serviceworker] install')
  e.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        console.log('[serviceworker] caching files')
        return cache.addAll(CACHED_FILES)
      })
      .then(() => {
        // force the waiting service worker to become the active service worker
        return self.skipWaiting()
      })
  )
})

// activate event - clean up old caches
self.addEventListener('activate', (e) => {
  console.log('[serviceworker] activate')
  e.waitUntil(
    caches
      .keys()
      .then((keyList) => {
        return Promise.all(
          keyList.map((key) => {
            if (key !== CACHE_NAME) {
              console.log('[serviceworker] removing old cache', key)
              return caches.delete(key)
            }
          })
        )
      })
      .then(() => {
        // take control of all pages immediately
        return self.clients.claim()
      })
  )
})

// fetch event - serve static files from cache, dynamic requests from network
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url)
  const shouldCache = CACHED_FILES.some((cachedUrl) => {
    return cachedUrl.startsWith('http')
      ? e.request.url === cachedUrl //
      : url.pathname === '/' || url.pathname === '/index.html'
  })

  if (shouldCache) {
    e.respondWith(
      caches.match(e.request).then((response) => {
        if (response) {
          console.log('[serviceworker] serving from cache:', e.request.url)
          return response
        }

        console.log('[serviceworker] cache miss, fetching and caching:', e.request.url)
        return fetch(e.request).then((networkResponse) => {
          const responseToCache = networkResponse.clone()
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(e.request, responseToCache)
          })
          return networkResponse
        })
      })
    )
  } else {
    e.respondWith(fetch(e.request))
  }
})
