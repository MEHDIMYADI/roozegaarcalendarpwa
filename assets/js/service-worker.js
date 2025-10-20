/*
 * Copyright (c) 2025 Mehdi Dimyadi (https://github.com/MEHDIMYADI)
 * Project: Roozegaar Calendar (https://dimyadi.ir/roozegaar-calendar/)
 *
 * If you use or get inspiration from this project,
 * please kindly mention my name or this project in your work.
 * It took a lot of effort to build, and I’d really appreciate your acknowledgment.
 *
 * Licensed under no specific open-source license — all rights reserved unless stated otherwise.
 */

// ======================= BASE PATH CONFIG =======================
const BASE_PATH = `${self.location.origin}/roozegaar-calendar`;

// ======================= SERVICE WORKER CONFIGURATION =======================
const CACHE_NAME = 'roozegaar-calendar-v1.0.0';
const FONT_CACHE = 'fontawesome-cache-v1';
const OFFLINE_PAGE = `${BASE_PATH}/offline.html`;

/**
 * Array of URLs to cache during installation
 */
const urlsToCache = [
    `${BASE_PATH}/`,
    `${BASE_PATH}/index.html`,
    `${BASE_PATH}/offline.html`,
    `${BASE_PATH}/assets/components/header.html`,
    `${BASE_PATH}/assets/components/footer.html`,
    `${BASE_PATH}/assets/css/style.css`,
    `${BASE_PATH}/assets/js/main.js`,
    `${BASE_PATH}/assets/js/jalaali.js`,
    `${BASE_PATH}/assets/data/manifest-en.json`,
    `${BASE_PATH}/assets/data/manifest-fa.json`,
    `${BASE_PATH}/assets/lang/fa.json`,
    `${BASE_PATH}/assets/lang/en.json`,
    `${BASE_PATH}/assets/images/icons/icon-72x72.png`,
    `${BASE_PATH}/assets/images/icons/icon-96x96.png`,
    `${BASE_PATH}/assets/images/icons/icon-128x128.png`,
    `${BASE_PATH}/assets/images/icons/icon-144x144.png`,
    `${BASE_PATH}/assets/images/icons/icon-152x152.png`,
    `${BASE_PATH}/assets/images/icons/icon-192x192.png`,
    `${BASE_PATH}/assets/images/icons/icon-384x384.png`,
    `${BASE_PATH}/assets/images/icons/icon-512x512.png`
];

// ======================= INSTALL EVENT HANDLER =======================
self.addEventListener('install', (event) => {
    console.log('Service Worker: Installing...');
    event.waitUntil(
        (async () => {
            const cache = await caches.open(CACHE_NAME);
            console.log('Service Worker: Caching app shell...');
            await cache.addAll(urlsToCache);
            console.log('Service Worker: Install completed.');
            await self.skipWaiting();
        })()
    );
});

// ======================= ACTIVATE EVENT HANDLER =======================
self.addEventListener('activate', (event) => {
    console.log('Service Worker: Activating...');
    event.waitUntil(
        (async () => {
            const cacheNames = await caches.keys();
            await Promise.all(
                cacheNames.map((name) => {
                    if (name !== CACHE_NAME && name !== FONT_CACHE) {
                        console.log('Service Worker: Removing old cache', name);
                        return caches.delete(name);
                    }
                })
            );
            console.log('Service Worker: Activation complete.');
            await self.clients.claim();
        })()
    );
});

// ======================= FETCH EVENT HANDLER =======================
self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') return;

    const url = event.request.url;

    // ======================= FONT AWESOME CACHING =======================
    if (
        url.includes('fontawesome') ||
        url.includes('cdnjs.cloudflare.com') ||
        url.includes('kit.fontawesome.com') ||
        url.endsWith('.woff2') ||
        url.endsWith('.woff') ||
        url.endsWith('.ttf') ||
        url.endsWith('.css')
    ) {
        event.respondWith(
            caches.open(FONT_CACHE).then(async (cache) => {
                const cachedResponse = await cache.match(event.request);
                if (cachedResponse) {
                    console.log('Service Worker: Serving Font Awesome from cache', url);
                    return cachedResponse;
                }

                try {
                    const networkResponse = await fetch(event.request);
                    if (networkResponse.status === 200) {
                        cache.put(event.request, networkResponse.clone());
                        console.log('Service Worker: Cached Font Awesome', url);
                    }
                    return networkResponse;
                } catch (error) {
                    console.warn('Service Worker: Failed to fetch Font Awesome', error);
                    return cachedResponse || new Response('', { status: 404 });
                }
            })
        );
        return;
    }

    // ======================= DEFAULT CACHE-FIRST STRATEGY =======================
    event.respondWith(
        (async () => {
            const cached = await caches.match(event.request);
            if (cached) {
                console.log('Service Worker: Serving from cache', url);
                return cached;
            }

            try {
                const response = await fetch(event.request);
                if (response && response.status === 200 && response.type === 'basic') {
                    const cache = await caches.open(CACHE_NAME);
                    cache.put(event.request, response.clone());
                }
                return response;
            } catch (error) {
                console.warn('Service Worker: Network failed, serving offline fallback');
                return handleOfflineFallback(event.request);
            }
        })()
    );
});

// ======================= OFFLINE FALLBACK =======================
async function handleOfflineFallback(request) {
    if (request.mode === 'navigate') {
        const cachedPage = await caches.match(OFFLINE_PAGE);
        if (cachedPage) return cachedPage;

        return new Response(
            '<h1>آفلاین هستید</h1><p>لطفاً اتصال اینترنت خود را بررسی کنید.</p>',
            { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
        );
    }

    return new Response('Network error', { status: 408, statusText: 'Offline' });
}

// ======================= PUSH NOTIFICATION HANDLERS =======================
const NOTIFICATION_OPTIONS = {
    body: 'یادآوری رویداد جدید',
    icon: `${BASE_PATH}/assets/images/icons/icon-192x192.png`,
    badge: `${BASE_PATH}/assets/images/icons/icon-72x72.png`,
    dir: 'rtl',
    lang: 'fa',
    vibrate: [200, 100, 200],
    tag: 'calendar-reminder'
};

self.addEventListener('push', (event) => {
    console.log('Service Worker: Push received');
    let notificationData = { title: 'Roozegaar Calendar', ...NOTIFICATION_OPTIONS };

    if (event.data) {
        try {
            const payload = event.data.json();
            notificationData = { ...notificationData, ...payload };
        } catch {
            console.warn('Service Worker: Push payload is not JSON');
        }
    }

    event.waitUntil(self.registration.showNotification(notificationData.title, notificationData));
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    event.waitUntil(
        (async () => {
            const allClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
            const appClient = allClients.find(c => c.url.includes(BASE_PATH) && 'focus' in c);
            if (appClient) return appClient.focus();
            return self.clients.openWindow(`${BASE_PATH}/`);
        })()
    );
});

// ======================= BACKGROUND SYNC HANDLER =======================
self.addEventListener('sync', (event) => {
    if (event.tag === 'sync-events') {
        event.waitUntil(syncPendingEvents());
    }
});

async function syncPendingEvents() {
    console.log('Service Worker: Background sync triggered');
}

// ======================= ERROR HANDLING =======================
self.addEventListener('unhandledrejection', (event) => {
    console.error('Service Worker: Unhandled Promise Rejection', event.reason);
});

self.addEventListener('error', (event) => {
    console.error('Service Worker: Runtime Error', event.error);
});

console.log('Service Worker: Loaded successfully ✅');
