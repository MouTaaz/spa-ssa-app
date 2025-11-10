// Service Worker for SPA SSA App - Production
const CACHE_NAME = "spa-ssa-v1.0.0";
const RUNTIME_CACHE = "spa-ssa-runtime-v1";

// Core app shell - cache these immediately
const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/manifest.json",
  "/icon-192.png",
  "/icon-512.png",
];

// Install event - cache static assets
self.addEventListener("install", (event) => {
  console.log("Service Worker: Installing");
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        console.log("Service Worker: Caching static assets");
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener("activate", (event) => {
  console.log("Service Worker: Activating");
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE) {
              console.log("Service Worker: Deleting old cache", cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch event - smart caching strategies
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== "GET") return;

  // Network First for API calls
  if (url.pathname.includes("/api/") || url.hostname.includes("supabase.co")) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache successful API responses
          if (response.status === 200) {
            const responseClone = response.clone();
            caches.open(RUNTIME_CACHE).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // Fallback to cache when offline
          return caches.match(request);
        })
    );
    return;
  }

  // Cache First for static assets
  if (
    url.pathname.includes("/assets/") ||
    url.pathname.includes("/static/") ||
    url.pathname.endsWith(".js") ||
    url.pathname.endsWith(".css") ||
    url.pathname.endsWith(".png") ||
    url.pathname.endsWith(".ico")
  ) {
    event.respondWith(
      caches.match(request).then((response) => {
        if (response) {
          return response;
        }
        return fetch(request).then((response) => {
          if (response.status === 200) {
            const responseClone = response.clone();
            caches.open(RUNTIME_CACHE).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        });
      })
    );
    return;
  }

  // Network First for HTML pages
  if (request.headers.get("accept")?.includes("text/html")) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const responseClone = response.clone();
          caches.open(RUNTIME_CACHE).then((cache) => {
            cache.put(request, responseClone);
          });
          return response;
        })
        .catch(() => {
          return caches.match("/index.html");
        })
    );
    return;
  }

  // Default: Network First
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.status === 200) {
          const responseClone = response.clone();
          caches.open(RUNTIME_CACHE).then((cache) => {
            cache.put(request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        return caches.match(request);
      })
  );
});

// Background sync for offline actions
self.addEventListener("sync", (event) => {
  if (event.tag === "background-sync") {
    console.log("Service Worker: Background sync triggered");
    event.waitUntil(doBackgroundSync());
  }
});

// Message handling from main app
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }

  if (event.data && event.data.type === "SYNC_DATA") {
    console.log("Service Worker: Sync data requested");
    doBackgroundSync();
  }
});

async function doBackgroundSync() {
  console.log("Service Worker: Performing background sync");
  // Implement your background sync logic here
  // This could sync offline appointments, etc.
}

// Push notifications handling
self.addEventListener("push", (event) => {
  if (!event.data) return;

  const data = event.data.json();
  const options = {
    body: data.body || "New notification from SSA App",
    icon: "/icon-192.png",
    badge: "/icon-96.png",
    tag: data.tag || "ssa-notification",
    data: data.data || {},
    requireInteraction: data.requireInteraction || false,
    silent: data.silent || false,
    actions: data.actions || [],
    timestamp: data.timestamp || Date.now(),
  };

  // Add vibration for mobile devices
  if ("vibrate" in navigator) {
    options.vibrate = [200, 100, 200];
  }

  event.waitUntil(
    self.registration.showNotification(data.title || "SSA Manager", options)
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const notificationData = event.notification.data || {};
  let targetUrl = "/";

  // Handle different notification types
  if (
    notificationData.type === "appointment_reminder" &&
    notificationData.appointmentId
  ) {
    targetUrl = `/appointments/${notificationData.appointmentId}`;
  } else if (
    notificationData.type === "appointment_update" &&
    notificationData.appointmentId
  ) {
    targetUrl = `/appointments/${notificationData.appointmentId}`;
  } else if (notificationData.url) {
    targetUrl = notificationData.url;
  }

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        // Check if app is already open
        for (const client of clientList) {
          if (client.url.includes(targetUrl) && "focus" in client) {
            return client.focus();
          }
        }

        // Open new window/tab if not already open
        if (clients.openWindow) {
          return clients.openWindow(targetUrl);
        }
      })
  );
});

// Background sync for offline functionality
self.addEventListener("sync", (event) => {
  console.log("Service Worker: Background sync triggered", event.tag);

  if (event.tag === "sync-appointments") {
    event.waitUntil(syncAppointments());
  } else if (event.tag === "sync-notifications") {
    event.waitUntil(syncNotifications());
  }
});

async function syncAppointments() {
  try {
    // Sync offline appointment changes
    const cache = await caches.open("offline-queue");
    const requests = await cache.keys();

    for (const request of requests) {
      if (request.url.includes("/api/appointments")) {
        try {
          await fetch(request);
          await cache.delete(request);
        } catch (error) {
          console.error("Failed to sync appointment:", error);
        }
      }
    }
  } catch (error) {
    console.error("Background sync failed:", error);
  }
}

async function syncNotifications() {
  try {
    // Mark notifications as read or handle other notification sync tasks
    console.log("Syncing notifications...");
    // Implementation depends on specific notification sync requirements
  } catch (error) {
    console.error("Notification sync failed:", error);
  }
}
