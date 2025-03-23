// Service Worker for AI Actor Generator App
const CACHE_NAME = 'ai-actor-generator-v1';

// Assets to cache on install
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico',
  '/assets/icons/icon-192x192.png',
  '/assets/icons/icon-512x512.png',
  '/assets/images/placeholder.jpg',
  // CSS and JS files will be added automatically during build
];

// Install event - precache static assets
self.addEventListener('install', event => {
  console.log('[Service Worker] Installing');
  
  // Skip waiting to ensure the new service worker activates immediately
  self.skipWaiting();
  
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[Service Worker] Precaching assets');
      return cache.addAll(PRECACHE_ASSETS);
    })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  console.log('[Service Worker] Activating');
  
  // Take control of all clients immediately
  self.clients.claim();
  
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.filter(cacheName => {
          return cacheName.startsWith('ai-actor-generator-') && cacheName !== CACHE_NAME;
        }).map(cacheName => {
          console.log('[Service Worker] Deleting old cache:', cacheName);
          return caches.delete(cacheName);
        })
      );
    })
  );
});

// Helper functions to determine request types
const isApiRequest = request => {
  const url = new URL(request.url);
  return url.pathname.startsWith('/api/');
};

const isStaticAsset = request => {
  const url = new URL(request.url);
  return url.pathname.match(/\.(js|css|png|jpg|jpeg|svg|ico|woff|woff2|ttf|eot)$/);
};

const isHtmlRequest = request => {
  const acceptHeader = request.headers.get('Accept') || '';
  return acceptHeader.includes('text/html') && !isStaticAsset(request) && !isApiRequest(request);
};

// Fetch event - handle offline functionality
self.addEventListener('fetch', event => {
  const request = event.request;
  
  // Skip cross-origin requests
  if (!request.url.startsWith(self.location.origin)) return;
  
  // Strategy for API requests - network first, fallback to cache
  if (isApiRequest(request)) {
    event.respondWith(
      fetch(request.clone())
        .then(response => {
          // Cache successful responses
          if (response.ok) {
            const clonedResponse = response.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(request, clonedResponse);
            });
          }
          return response;
        })
        .catch(() => {
          // If network fails, try cache
          return caches.match(request).then(cacheResponse => {
            return cacheResponse || new Response(
              JSON.stringify({ error: 'You appear to be offline' }),
              { headers: { 'Content-Type': 'application/json' } }
            );
          });
        })
    );
    return;
  }
  
  // Strategy for static assets - cache first, network fallback
  if (isStaticAsset(request)) {
    event.respondWith(
      caches.match(request).then(cacheResponse => {
        return cacheResponse || fetch(request.clone())
          .then(response => {
            // Cache the new response
            if (response.ok) {
              const clonedResponse = response.clone();
              caches.open(CACHE_NAME).then(cache => {
                cache.put(request, clonedResponse);
              });
            }
            return response;
          })
          .catch(() => {
            // For images, return a placeholder
            if (request.url.match(/\.(jpg|jpeg|png|gif|webp|svg)$/)) {
              return caches.match('/assets/images/placeholder.jpg');
            }
            return new Response('Not available offline', {
              status: 408,
              headers: { 'Content-Type': 'text/plain' }
            });
          });
      })
    );
    return;
  }
  
  // Strategy for HTML navigation requests - network first, then cache, then offline page
  if (isHtmlRequest(request)) {
    event.respondWith(
      fetch(request.clone())
        .then(response => {
          // Cache the response if it's successful
          if (response.ok) {
            const clonedResponse = response.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(request, clonedResponse);
            });
          }
          return response;
        })
        .catch(() => {
          // If network fails, try cache
          return caches.match(request).then(cacheResponse => {
            return cacheResponse || caches.match('/offline.html');
          });
        })
    );
    return;
  }
  
  // Default strategy for other requests
  event.respondWith(
    caches.match(request).then(cacheResponse => {
      return cacheResponse || fetch(request);
    })
  );
});

// Handle background sync for pending uploads
self.addEventListener('sync', event => {
  if (event.tag === 'pendingUploads') {
    event.waitUntil(processPendingUploads());
  }
});

// Function to process any pending uploads when back online
async function processPendingUploads() {
  try {
    // Open IndexedDB to get pending uploads
    const db = await openDatabase();
    const pendingUploads = await getPendingUploads(db);
    
    // Process each pending upload
    for (const upload of pendingUploads) {
      try {
        // Attempt to upload the file
        const uploadResponse = await fetch('/api/upload', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(upload)
        });
        
        if (uploadResponse.ok) {
          // Remove from pending uploads if successful
          await removePendingUpload(db, upload.id);
          // Notify clients about the successful upload
          notifyClients('UPLOAD_COMPLETED', { uploadId: upload.id });
        }
      } catch (error) {
        console.error('[Service Worker] Failed to process upload:', error);
      }
    }
  } catch (error) {
    console.error('[Service Worker] Error in processPendingUploads:', error);
  }
}

// Helper function to notify all clients about events
function notifyClients(type, data) {
  self.clients.matchAll().then(clients => {
    clients.forEach(client => {
      client.postMessage({
        type,
        ...data
      });
    });
  });
}

// Database helper functions for pending uploads
function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('AIActorOfflineDB', 1);
    
    request.onupgradeneeded = event => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('pendingUploads')) {
        db.createObjectStore('pendingUploads', { keyPath: 'id' });
      }
    };
    
    request.onsuccess = event => resolve(event.target.result);
    request.onerror = event => reject(event.target.error);
  });
}

function getPendingUploads(db) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['pendingUploads'], 'readonly');
    const store = transaction.objectStore('pendingUploads');
    const request = store.getAll();
    
    request.onsuccess = event => resolve(event.target.result);
    request.onerror = event => reject(event.target.error);
  });
}

function removePendingUpload(db, id) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['pendingUploads'], 'readwrite');
    const store = transaction.objectStore('pendingUploads');
    const request = store.delete(id);
    
    request.onsuccess = event => resolve();
    request.onerror = event => reject(event.target.error);
  });
}
