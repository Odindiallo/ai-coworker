/**
 * Service Worker registration and management
 * This utility handles the registration of the service worker for offline support
 * and provides methods for communicating with the service worker.
 */

// Check if service workers are supported by the browser
export const isServiceWorkerSupported = (): boolean => {
  return 'serviceWorker' in navigator;
};

// Register the service worker
export const registerServiceWorker = async (): Promise<void> => {
  if (!isServiceWorkerSupported()) {
    console.log('Service workers are not supported by this browser');
    return;
  }

  try {
    const registration = await navigator.serviceWorker.register('/service-worker.js', {
      scope: '/',
    });

    if (registration.installing) {
      console.log('Service worker installing');
    } else if (registration.waiting) {
      console.log('Service worker installed but waiting');
      // Notify the user about new content being available
      showUpdateNotification(registration);
    } else if (registration.active) {
      console.log('Service worker active');
    }

    // Handle service worker updates
    registration.addEventListener('updatefound', () => {
      // When the service worker is first installed or updated
      const newWorker = registration.installing;
      
      if (!newWorker) return;

      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          // New service worker available
          showUpdateNotification(registration);
        }
      });
    });

    // Check for service worker updates every hour
    setInterval(() => {
      registration.update();
    }, 60 * 60 * 1000);

  } catch (error) {
    console.error('Error during service worker registration:', error);
  }
};

// Show a notification about new content being available
const showUpdateNotification = (registration: ServiceWorkerRegistration): void => {
  // Create a notification element
  const notificationElement = document.createElement('div');
  notificationElement.className = 'fixed bottom-0 left-0 right-0 bg-primary-600 text-white p-4 flex justify-between items-center z-50';
  notificationElement.innerHTML = `
    <div>
      <p class="font-medium">New version available!</p>
      <p class="text-sm">Refresh to update the app.</p>
    </div>
    <div class="flex space-x-2">
      <button id="sw-refresh" class="px-4 py-2 bg-white text-primary-600 rounded-md font-medium min-h-[44px]">
        Refresh Now
      </button>
      <button id="sw-dismiss" class="px-4 py-2 bg-transparent border border-white text-white rounded-md font-medium min-h-[44px]">
        Later
      </button>
    </div>
  `;

  // Append to body
  document.body.appendChild(notificationElement);

  // Add event listeners
  document.getElementById('sw-refresh')?.addEventListener('click', () => {
    // Skip waiting and reload
    if (registration.waiting) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
    window.location.reload();
  });

  document.getElementById('sw-dismiss')?.addEventListener('click', () => {
    // Remove the notification
    notificationElement.remove();
  });
};

// Function to update the cache
export const updateCache = (urls: string[]): void => {
  if (!isServiceWorkerSupported() || !navigator.serviceWorker.controller) return;

  navigator.serviceWorker.controller.postMessage({
    type: 'CACHE_UPDATE',
    urls,
  });
};

// Show offline indicator
export const showOfflineIndicator = (): void => {
  // If the indicator already exists, don't create another one
  if (document.getElementById('offline-indicator')) return;

  const indicator = document.createElement('div');
  indicator.id = 'offline-indicator';
  indicator.className = 'fixed top-0 left-0 right-0 bg-yellow-500 text-white px-4 py-2 text-center text-sm z-50';
  indicator.textContent = 'You are currently offline. Some features may be unavailable.';
  
  document.body.prepend(indicator);
};

// Hide offline indicator
export const hideOfflineIndicator = (): void => {
  const indicator = document.getElementById('offline-indicator');
  if (indicator) {
    indicator.remove();
  }
};

// Function to save a pending upload for background sync
export const savePendingUpload = async (uploadData: any): Promise<string> => {
  return new Promise((resolve, reject) => {
    // Open the database
    const request = indexedDB.open('AIActorOfflineDB', 1);
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      // Create object store if it doesn't exist
      if (!db.objectStoreNames.contains('pendingUploads')) {
        db.createObjectStore('pendingUploads', { keyPath: 'id' });
      }
    };
    
    request.onsuccess = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      const transaction = db.transaction(['pendingUploads'], 'readwrite');
      const store = transaction.objectStore('pendingUploads');
      
      // Generate a unique ID
      const id = `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Save upload data with ID
      const data = {
        id,
        ...uploadData,
        timestamp: Date.now(),
      };
      
      const saveRequest = store.add(data);
      
      saveRequest.onsuccess = () => {
        // Request background sync if available
        if ('serviceWorker' in navigator && 'SyncManager' in window) {
          navigator.serviceWorker.ready
            .then(registration => {
              registration.sync.register('pendingUploads')
                .then(() => {
                  console.log('Background sync registered for pending uploads');
                })
                .catch(err => {
                  console.error('Background sync registration failed:', err);
                });
            });
        }
        
        resolve(id);
      };
      
      saveRequest.onerror = () => {
        reject(new Error('Failed to save pending upload'));
      };
    };
    
    request.onerror = () => {
      reject(new Error('Failed to open database'));
    };
  });
};

// Function to check if there are any pending uploads
export const hasPendingUploads = async (): Promise<boolean> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('AIActorOfflineDB', 1);
    
    request.onsuccess = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      const transaction = db.transaction(['pendingUploads'], 'readonly');
      const store = transaction.objectStore('pendingUploads');
      
      const countRequest = store.count();
      
      countRequest.onsuccess = () => {
        resolve(countRequest.result > 0);
      };
      
      countRequest.onerror = () => {
        reject(new Error('Failed to count pending uploads'));
      };
    };
    
    request.onerror = () => {
      reject(new Error('Failed to open database'));
    };
  });
};

// Initialize online/offline event listeners
export const initOnlineStatusListeners = (): void => {
  // Listen for online/offline events
  window.addEventListener('online', () => {
    hideOfflineIndicator();
    
    // Attempt to process pending uploads
    if ('serviceWorker' in navigator && 'SyncManager' in window) {
      navigator.serviceWorker.ready.then(registration => {
        registration.sync.register('pendingUploads');
      });
    }
  });

  window.addEventListener('offline', () => {
    showOfflineIndicator();
  });

  // Show offline indicator if initially offline
  if (!navigator.onLine) {
    showOfflineIndicator();
  }
};
