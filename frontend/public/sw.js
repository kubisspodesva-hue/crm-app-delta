// Jednoduchý service worker pro PWA - cíl: appka se dá nainstalovat na plochu
// telefonu a základní shell (statické soubory, ikony) se načte i při slabém
// signálu. Data z API (leady, statistiky...) se NIKDY needukují do cache -
// vždy jde čerstvý požadavek na server, aby obchodník neviděl zastaralá data.

const CACHE_NAME = 'crm-shell-v1';
const PRECACHE_URLS = ['/manifest.json', '/icons/icon-192.png', '/icons/icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))),
      ),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Požadavky mimo náš origin (backend API) necháváme vždy jít na síť -
  // nikdy je nekešujeme, ať jsou data v CRM vždy aktuální.
  if (url.origin !== self.location.origin) {
    return;
  }

  // Pouze GET požadavky lze bezpečně kešovat.
  if (event.request.method !== 'GET') {
    return;
  }

  // Network-first s fallbackem do cache: appka je vždy co nejaktuálnější,
  // ale při výpadku signálu se stránka i tak něčím vykreslí.
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request)),
  );
});
