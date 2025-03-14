const CACHE_NAME = 'fruit-catcher-v1';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './styles.css',
  './game.js',
  './manifest.json',
  './background.svg',
  './icons/icon-72x72.png',
  './icons/icon-96x96.png',
  './icons/icon-128x128.png',
  './icons/icon-144x144.png',
  './icons/icon-152x152.png',
  './icons/icon-192x192.png',
  './icons/icon-384x384.png',
  './icons/icon-512x512.png',
  'https://www.soundjay.com/misc/sounds/bell-ringing-05.mp3',
  'https://www.soundjay.com/misc/sounds/fail-trombone-01.mp3',
  'https://www.soundjay.com/misc/sounds/magic-chime-02.mp3',
  'https://www.soundjay.com/misc/sounds/wrong-buzzer-01.mp3',
  'https://www.soundjay.com/misc/sounds/fairy-dust-01.mp3',
  'https://www.bensound.com/bensound-music/bensound-relaxing.mp3'
];

// Install event - cache assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(ASSETS_TO_CACHE);
      })
      .then(() => {
        return self.skipWaiting();
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// Fetch event - serve from cache, fall back to network
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Cache hit - return response
        if (response) {
          return response;
        }

        // Clone the request because it's a one-time use stream
        const fetchRequest = event.request.clone();

        return fetch(fetchRequest).then(
          (response) => {
            // Check if we received a valid response
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Clone the response because it's a one-time use stream
            const responseToCache = response.clone();

            caches.open(CACHE_NAME)
              .then((cache) => {
                // Don't cache if it's a data URL
                if (!event.request.url.startsWith('data:')) {
                  cache.put(event.request, responseToCache);
                }
              });

            return response;
          }
        );
      })
      .catch(() => {
        // If both cache and network fail, show a generic fallback
        return new Response('Offline - Cannot fetch resource');
      })
  );
});

// Handle background sync for offline data
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-scores') {
    event.waitUntil(syncScores());
  }
});

// Function to sync scores when online
async function syncScores() {
  try {
    const scoreData = await getOfflineScores();
    if (scoreData && scoreData.length > 0) {
      // Implement your score syncing logic here
      await clearOfflineScores();
    }
  } catch (error) {
    console.error('Error syncing scores:', error);
  }
}

// IndexedDB setup for offline storage
const dbName = 'FruitCatcherDB';
const storeName = 'gameData';
const version = 1;

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(dbName, version);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(storeName)) {
        db.createObjectStore(storeName, { keyPath: 'id' });
      }
    };
  });
}

// Save game data to IndexedDB
async function saveToIndexedDB(data) {
  const db = await openDB();
  const tx = db.transaction(storeName, 'readwrite');
  const store = tx.objectStore(storeName);
  await store.put(data);
}

// Get game data from IndexedDB
async function getFromIndexedDB(id) {
  const db = await openDB();
  const tx = db.transaction(storeName, 'readonly');
  const store = tx.objectStore(storeName);
  return await store.get(id);
} 